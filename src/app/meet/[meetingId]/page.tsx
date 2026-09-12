"use client";

// ============================================================
// MentorMesh — In-App Live Video Meeting Room (/meet/[meetingId])
// WebRTC Audio/Video Mesh, Screen Share, Signaling via Firestore
// 4-Character Code Resolution, Waiting Room with Host Knock/Admit,
// Camera/Mic Permissions, In-Meeting Chat, Host Controls Drawer,
// Attendance Auditing & Host Post-Meeting Summary Submission
// ============================================================
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import {
  getScheduledMeetingByCodeOrId,
  recordParticipantJoin,
  recordParticipantLeave,
  endLiveMeeting,
} from "@/lib/firebase/firestore";
import type { ScheduledMeeting, LiveMeetingParticipant, InMeetingChatMessage } from "@/types";
import {
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  query,
  orderBy,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import {
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  ScreenShare,
  PhoneOff,
  Users,
  MessageSquare,
  Hand,
  Smile,
  Shield,
  Copy,
  Check,
  VolumeX,
  Loader2,
  AlertCircle,
  Clock,
  Calendar,
  X,
  Send,
  RefreshCw,
  LogOut,
  Monitor,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/ToastProvider";
import { PostMeetingSummaryModal } from "@/components/meetings/PostMeetingSummaryModal";

const REACTION_EMOJIS = ["👍", "❤️", "👏", "🎉", "🔥", "🚀", "💡"];
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

interface WaitingRoomRequest {
  id: string;
  name: string;
  email: string;
  role?: string;
  status: "waiting" | "admitted" | "denied";
  requestedAt: number;
}

// ── Remote Participant Card with Live Video / Avatar Fallback ──────
function RemoteParticipantCard({
  peer,
  stream,
  isHost,
}: {
  peer: LiveMeetingParticipant;
  stream?: MediaStream | null;
  isHost?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasVideoTrack, setHasVideoTrack] = useState(false);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      const vTrack = stream.getVideoTracks()[0];
      if (vTrack) {
        setHasVideoTrack(vTrack.enabled && vTrack.readyState === "live");
        const handleTrackState = () => {
          setHasVideoTrack(vTrack.enabled && vTrack.readyState === "live");
        };
        vTrack.addEventListener("mute", handleTrackState);
        vTrack.addEventListener("unmute", handleTrackState);
        vTrack.addEventListener("ended", handleTrackState);
        return () => {
          vTrack.removeEventListener("mute", handleTrackState);
          vTrack.removeEventListener("unmute", handleTrackState);
          vTrack.removeEventListener("ended", handleTrackState);
        };
      } else {
        setHasVideoTrack(false);
      }
    } else {
      setHasVideoTrack(false);
    }
  }, [stream]);

  return (
    <div className="relative w-full aspect-video bg-slate-900 rounded-3xl overflow-hidden border-2 border-slate-800 shadow-2xl flex items-center justify-center group transition-all">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className={`w-full h-full object-cover ${!hasVideoTrack ? "hidden" : ""}`}
      />
      {!hasVideoTrack && (
        <div className="flex flex-col items-center gap-2.5 p-4 text-center">
          <Avatar
            name={peer.name}
            photoUrl={peer.photoUrl}
            size="lg"
            className="w-20 h-20 text-2xl ring-4 ring-slate-800 bg-slate-800 text-white shadow-xl"
          />
          <div>
            <p className="text-slate-200 text-sm font-bold truncate max-w-[200px]">{peer.name}</p>
            <span className="inline-block mt-1 text-[10px] text-slate-400 capitalize px-2 py-0.5 rounded-full bg-slate-800/80 border border-slate-700/80">
              {peer.role || "Participant"}
            </span>
          </div>
        </div>
      )}

      {/* Bottom tag info */}
      <div className="absolute bottom-3.5 left-3.5 flex items-center gap-2 bg-slate-950/80 backdrop-blur-md px-3.5 py-1.5 rounded-full text-xs font-bold border border-slate-700/80">
        <span className="truncate max-w-[120px]">{peer.name}</span>
        {isHost && <span className="text-[10px] text-amber-400 font-semibold">★ Host</span>}
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
      </div>
    </div>
  );
}

export default function MeetRoomPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { success, error } = useToast();
  const rawMeetingParam = params.meetingId as string;

  // ── Meeting State ──────────────────────────────────────────────
  const [meeting, setMeeting] = useState<ScheduledMeeting | null>(null);
  const [actualMeetingId, setActualMeetingId] = useState<string>(rawMeetingParam);
  const [loading, setLoading] = useState(true);

  // ── Pre-join vs Joined ─────────────────────────────────────────
  const [joined, setJoined] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const autoJoinedRef = useRef(false);

  // ── Waiting Room State for Non-Host / Guests ───────────────────
  const [waitingStatus, setWaitingStatus] = useState<"idle" | "waiting" | "admitted" | "denied">("idle");
  const [waitingList, setWaitingList] = useState<WaitingRoomRequest[]>([]);

  // ── Hardware Media Streams & Device Permissions ────────────────
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCamOn, setIsCamOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [retryingMedia, setRetryingMedia] = useState(false);

  // ── Drawers & Side Panels ──────────────────────────────────────
  const [activePanel, setActivePanel] = useState<"none" | "participants" | "chat" | "hostControls">("none");
  const [raisedHand, setRaisedHand] = useState(false);
  const [reactions, setReactions] = useState<{ id: string; emoji: string; x: number }[]>([]);
  const [showReactionsMenu, setShowReactionsMenu] = useState(false);

  // ── Remote Peers & WebRTC Connections ──────────────────────────
  const peerConnections = useRef<Record<string, RTCPeerConnection>>({});
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
  const mySessionIdRef = useRef<string>("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      let sid = sessionStorage.getItem(`mm_meet_sid_${actualMeetingId}`);
      if (!sid) {
        sid = "sid_" + Math.random().toString(36).slice(2, 9) + "_" + Date.now();
        sessionStorage.setItem(`mm_meet_sid_${actualMeetingId}`, sid);
      }
      mySessionIdRef.current = sid;
    }
  }, [actualMeetingId]);

  // ── Helper to distinguish current user vs remote peers ─────────
  const isMe = useCallback(
    (p: LiveMeetingParticipant) => {
      // 1. If UID matches, this is definitively the current user
      if (user?.uid && p.uid && p.uid === user.uid) return true;
      // 2. If email matches, this is definitively the current user
      if (user?.email && p.email && user.email.toLowerCase() === p.email.toLowerCase()) return true;
      // 3. Match by active sessionId
      if (mySessionIdRef.current && p.sessionId && p.sessionId === mySessionIdRef.current) return true;
      // 4. If guest / unauthenticated, match by guest email
      if (!user && guestEmail && p.email && guestEmail.toLowerCase() === p.email.toLowerCase()) return true;
      return false;
    },
    [user?.uid, user?.email, guestEmail]
  );

  const remoteParticipants = (meeting?.attendance || []).filter(
    (p) => !isMe(p) && p.joined && p.status !== "left"
  );
  const totalParticipants = 1 + remoteParticipants.length;

  // ── WebRTC Peer Connection Factory ──────────────────────────────
  const createPeerConnection = useCallback(
    (peerKey: string) => {
      if (peerConnections.current[peerKey]) {
        try {
          peerConnections.current[peerKey].close();
        } catch (_) {}
      }

      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
        ],
      });

      if (localStream) {
        localStream.getTracks().forEach((track) => {
          pc.addTrack(track, localStream);
        });
      }

      pc.onicecandidate = (event) => {
        if (event.candidate && actualMeetingId && mySessionIdRef.current) {
          addDoc(collection(db, "scheduledMeetings", actualMeetingId, "signals"), {
            from: mySessionIdRef.current,
            to: peerKey,
            type: "candidate",
            candidate: JSON.stringify(event.candidate),
            createdAt: Date.now(),
          }).catch(() => {});
        }
      };

      pc.ontrack = (event) => {
        const stream = event.streams[0] || new MediaStream([event.track]);
        setRemoteStreams((prev) => ({
          ...prev,
          [peerKey]: stream,
        }));
      };

      peerConnections.current[peerKey] = pc;
      return pc;
    },
    [actualMeetingId, localStream]
  );

  // ── WebRTC Incoming Signals Listener ────────────────────────────
  useEffect(() => {
    if (!joined || !actualMeetingId || !mySessionIdRef.current) return;
    const mySid = mySessionIdRef.current;

    const signalsCol = collection(db, "scheduledMeetings", actualMeetingId, "signals");
    const q = query(signalsCol, where("to", "==", mySid));

    const unsub = onSnapshot(
      q,
      async (snap) => {
        for (const change of snap.docChanges()) {
          if (change.type !== "added") continue;
          const data = change.doc.data();
          const fromSid = data.from;
          if (!fromSid || fromSid === mySid) continue;

          try {
            if (data.type === "offer") {
              let pc = peerConnections.current[fromSid];
              if (!pc || pc.connectionState === "closed") {
                pc = createPeerConnection(fromSid);
              }
              await pc.setRemoteDescription(new RTCSessionDescription(JSON.parse(data.sdp)));
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);

              await addDoc(signalsCol, {
                from: mySid,
                to: fromSid,
                type: "answer",
                sdp: JSON.stringify(answer),
                createdAt: Date.now(),
              });
            } else if (data.type === "answer") {
              const pc = peerConnections.current[fromSid];
              if (pc && pc.signalingState === "have-local-offer") {
                await pc.setRemoteDescription(new RTCSessionDescription(JSON.parse(data.sdp)));
              }
            } else if (data.type === "candidate") {
              const pc = peerConnections.current[fromSid];
              if (pc && data.candidate) {
                await pc.addIceCandidate(new RTCIceCandidate(JSON.parse(data.candidate))).catch(() => {});
              }
            }
          } catch (err) {
            console.warn("Signaling process error:", err);
          }
        }
      },
      (err) => {
        console.warn("Signal listener notice:", err?.message);
      }
    );

    return () => unsub();
  }, [joined, actualMeetingId, createPeerConnection]);

  // ── WebRTC Mesh Initiator (for remote peers) ────────────────────
  useEffect(() => {
    if (!joined || !actualMeetingId || !mySessionIdRef.current) return;
    const mySid = mySessionIdRef.current;

    remoteParticipants.forEach(async (peer) => {
      const peerKey = peer.sessionId || peer.uid;
      if (!peerKey || peerKey === mySid) return;

      // Deterministic initiator: smaller session ID initiates
      if (mySid < peerKey && !peerConnections.current[peerKey]) {
        try {
          const pc = createPeerConnection(peerKey);
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);

          await addDoc(collection(db, "scheduledMeetings", actualMeetingId, "signals"), {
            from: mySid,
            to: peerKey,
            type: "offer",
            sdp: JSON.stringify(offer),
            createdAt: Date.now(),
          });
        } catch (err) {
          console.warn("Failed creating WebRTC offer for peer:", peerKey, err);
        }
      }
    });
  }, [joined, actualMeetingId, remoteParticipants, createPeerConnection]);

  // ── Sync local tracks across peer connections on toggle ────────
  useEffect(() => {
    if (!localStream) return;
    const videoTrack = localStream.getVideoTracks()[0];
    const audioTrack = localStream.getAudioTracks()[0];

    Object.values(peerConnections.current).forEach((pc) => {
      if (pc.signalingState === "closed") return;
      pc.getSenders().forEach((sender) => {
        if (sender.track?.kind === "video" && videoTrack) {
          sender.replaceTrack(videoTrack).catch(() => {});
        } else if (sender.track?.kind === "audio" && audioTrack) {
          sender.replaceTrack(audioTrack).catch(() => {});
        }
      });
    });
  }, [localStream, isCamOn, isMicOn]);

  // ── Chat & Signaling ───────────────────────────────────────────
  const [chatMessages, setChatMessages] = useState<InMeetingChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");

  // ── Host Controls, Summary Modal & Leave Call Modal ────────────
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [meetingDurationTimer, setMeetingDurationTimer] = useState("00:00");
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const prejoinVideoRef = useRef<HTMLVideoElement>(null);
  const screenVideoRef = useRef<HTMLVideoElement>(null);
  const screenTrackRef = useRef<MediaStreamTrack | null>(null);

  const isHost = meeting?.hostId === user?.uid;
  const isCoHost = meeting?.coHostIds?.includes(user?.uid || "");
  const isStaffOrAdmin = user?.role === "staff" || user?.role === "master";
  const hasHostControls = isHost || isCoHost || isStaffOrAdmin || (Boolean(meeting?.hostId) && Boolean(user?.uid) && meeting?.hostId === user?.uid);

  // ── 1. Request & Initialize Camera / Mic ────────────────────────
  const initUserMedia = useCallback(async () => {
    setRetryingMedia(true);
    setPermissionError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Your browser does not support WebRTC media access.");
      }

      let stream: MediaStream | null = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: "user",
          },
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
      } catch (comboErr) {
        console.warn("Combined media request failed, trying separate fallback...", comboErr);
        let vTrack: MediaStreamTrack | null = null;
        let aTrack: MediaStreamTrack | null = null;
        try {
          const vStream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
          });
          vTrack = vStream.getVideoTracks()[0] || null;
        } catch (vErr) {
          console.warn("Video-only access failed:", vErr);
        }
        try {
          const aStream = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
          });
          aTrack = aStream.getAudioTracks()[0] || null;
        } catch (aErr) {
          console.warn("Audio-only access failed:", aErr);
        }

        if (vTrack || aTrack) {
          stream = new MediaStream();
          if (vTrack) stream.addTrack(vTrack);
          if (aTrack) stream.addTrack(aTrack);
        } else {
          throw comboErr;
        }
      }

      const hasVideo = stream.getVideoTracks().length > 0;
      const hasAudio = stream.getAudioTracks().length > 0;

      setLocalStream(stream);
      setIsCamOn(hasVideo);
      setIsMicOn(hasAudio);
      setPermissionError(null);

      if (prejoinVideoRef.current && hasVideo) {
        prejoinVideoRef.current.srcObject = stream;
      }
      return stream;
    } catch (err: any) {
      console.warn("Media device permission warning:", err);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setPermissionError(
          "Camera or microphone access is blocked. Click the lock or camera icon in your browser address bar to grant permissions, then click 'Retry'."
        );
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        setPermissionError("No camera or microphone was found on this device.");
      } else {
        setPermissionError(
          "Unable to access camera or microphone. You can still participate in the session."
        );
      }
      setIsCamOn(false);
      setIsMicOn(false);
      return null;
    } finally {
      setRetryingMedia(false);
    }
  }, []);

  // ── 2. Join Meeting Room Helper ─────────────────────────────────
  const doJoinMeeting = useCallback(
    async (targetMeetingId: string, meetingObj: ScheduledMeeting, asHost = false) => {
      // Validate external / guest participants: only welcome if they provide valid name & email
      if (!user) {
        if (!guestName.trim() || guestName.trim().length < 2) {
          error("Please enter your full name to join.");
          return;
        }
        if (!guestEmail.trim() || !EMAIL_REGEX.test(guestEmail.trim())) {
          error("A valid email address is required to enter this meeting.");
          return;
        }
      }

      const isHostUser = asHost || meetingObj.hostId === user?.uid;
      const isCoHostUser = meetingObj.coHostIds?.includes(user?.uid || "");
      const currentUserName = user?.name || guestName.trim();
      const currentUserEmail = user?.email || guestEmail.trim();
      const currentUserPhoto = user?.profilePhoto || user?.professionalPhoto || "";

      if (!mySessionIdRef.current && typeof window !== "undefined") {
        let sid = sessionStorage.getItem(`mm_meet_sid_${targetMeetingId}`);
        if (!sid) {
          sid = "sid_" + Math.random().toString(36).slice(2, 9) + "_" + Date.now();
          sessionStorage.setItem(`mm_meet_sid_${targetMeetingId}`, sid);
        }
        mySessionIdRef.current = sid;
      }

      // Record participant join in Firestore attendance with profile photo and sessionId
      await recordParticipantJoin(targetMeetingId, {
        uid: user?.uid || undefined,
        sessionId: mySessionIdRef.current,
        name: currentUserName,
        email: currentUserEmail,
        photoUrl: currentUserPhoto,
        role: isHostUser ? "host" : isCoHostUser ? "co_host" : !user ? "external" : "participant",
        invited: true,
        joined: true,
      });

      setSessionStartTime(new Date());
      setJoined(true);
    },
    [user, guestName, guestEmail, error]
  );

  // ── 3. Load Meeting Details by 4-Digit Code or Document ID ───────
  useEffect(() => {
    let unsubMeeting: (() => void) | null = null;

    async function load() {
      try {
        setLoading(true);
        const data = await getScheduledMeetingByCodeOrId(rawMeetingParam);
        if (!data) {
          error("Meeting not found or has expired.");
          router.push("/meetings");
          return;
        }

        setMeeting(data);
        setActualMeetingId(data.id);

        // Real-time listener on the meeting document
        unsubMeeting = onSnapshot(
          doc(db, "scheduledMeetings", data.id),
          (snap) => {
            if (snap.exists()) {
              const updated = { id: snap.id, ...snap.data() } as ScheduledMeeting;
              setMeeting(updated);

              // If host ends meeting for all participants: cleanly terminate and exit
              if (
                (updated.status === "ended" || updated.status === "submitted_for_review") &&
                updated.hostId !== user?.uid
              ) {
                if (localStream) {
                  localStream.getTracks().forEach((t) => t.stop());
                }
                if (screenTrackRef.current) {
                  screenTrackRef.current.stop();
                }
                Object.values(peerConnections.current).forEach((pc) => pc.close());
                success("The host has ended this meeting.");
                router.push("/meetings");
              }
            }
          },
          (err) => {
            console.warn("Meeting doc snapshot warning:", err?.message);
          }
        );

        // Google Meet Flow: Host and participants land on the pre-join lobby card to check camera & mic before entering

        // If meeting already completed and host needs to submit report
        if (data.status === "summary_required" && data.hostId === user?.uid) {
          setShowSummaryModal(true);
        }
      } catch (err) {
        console.error("Error loading meeting room:", err);
      } finally {
        setLoading(false);
      }
    }

    load();

    return () => {
      if (unsubMeeting) unsubMeeting();
    };
  }, [rawMeetingParam, user?.uid, router, doJoinMeeting, error, success]);

  // ── 4. Live Meeting Timer ───────────────────────────────────────
  useEffect(() => {
    if (!joined || !sessionStartTime) return;
    const interval = setInterval(() => {
      const diffSecs = Math.floor((new Date().getTime() - sessionStartTime.getTime()) / 1000);
      const mins = Math.floor(diffSecs / 60);
      const secs = diffSecs % 60;
      setMeetingDurationTimer(
        `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
      );
    }, 1000);
    return () => clearInterval(interval);
  }, [joined, sessionStartTime]);

  // ── 5. Media Stream Initialization ──────────────────────────────
  useEffect(() => {
    if (!joined) {
      initUserMedia();
    }
  }, [joined, initUserMedia]);

  // Bind local stream to pre-join video preview element before entering
  useEffect(() => {
    if (!joined && prejoinVideoRef.current && localStream && isCamOn) {
      prejoinVideoRef.current.srcObject = localStream;
    }
  }, [joined, localStream, isCamOn]);

  // Bind local stream to in-room video element once joined
  useEffect(() => {
    if (joined && localVideoRef.current && localStream && isCamOn) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [joined, localStream, isCamOn]);

  // Clean up media tracks on unmount
  useEffect(() => {
    return () => {
      if (localStream) {
        localStream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [localStream]);

  // ── 6. Host Waiting Room Real-Time Listener ─────────────────────
  useEffect(() => {
    if (!actualMeetingId || !hasHostControls) return;

    const waitCol = collection(db, "scheduledMeetings", actualMeetingId, "waitingRoom");
    const unsub = onSnapshot(
      waitCol,
      (snap) => {
        const list: WaitingRoomRequest[] = [];
        snap.forEach((d) => {
          const item = d.data() as WaitingRoomRequest;
          if (item.status === "waiting") {
            list.push({ ...item, id: d.id });
          }
        });
        setWaitingList(list);
      },
      (err) => {
        console.warn("Waiting room snapshot warning:", err?.message);
      }
    );

    return () => unsub();
  }, [actualMeetingId, hasHostControls]);

  // ── 7. Toggle Microphone ────────────────────────────────────────
  const toggleMic = async () => {
    if (!localStream) {
      await initUserMedia();
      return;
    }
    const audioTrack = localStream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsMicOn(audioTrack.enabled);
    } else {
      try {
        const micStream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        });
        const newTrack = micStream.getAudioTracks()[0];
        localStream.addTrack(newTrack);
        setIsMicOn(true);
        Object.values(peerConnections.current).forEach((pc) => {
          const sender = pc.getSenders().find((s) => s.track?.kind === "audio");
          if (sender) sender.replaceTrack(newTrack);
          else pc.addTrack(newTrack, localStream);
        });
      } catch (err) {
        console.warn("Could not acquire microphone track:", err);
      }
    }
  };

  // ── 8. Toggle Camera ────────────────────────────────────────────
  const toggleCam = async () => {
    if (!localStream) {
      await initUserMedia();
      return;
    }
    const videoTrack = localStream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setIsCamOn(videoTrack.enabled);
    } else {
      try {
        const camStream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
        });
        const newTrack = camStream.getVideoTracks()[0];
        localStream.addTrack(newTrack);
        setIsCamOn(true);
        if (joined && localVideoRef.current) {
          localVideoRef.current.srcObject = localStream;
        } else if (!joined && prejoinVideoRef.current) {
          prejoinVideoRef.current.srcObject = localStream;
        }
        Object.values(peerConnections.current).forEach((pc) => {
          const sender = pc.getSenders().find((s) => s.track?.kind === "video");
          if (sender) sender.replaceTrack(newTrack);
          else pc.addTrack(newTrack, localStream);
        });
      } catch (err) {
        console.warn("Could not acquire camera track:", err);
      }
    }
  };

  // ── 9. Real Screen Sharing (Google Meet Showcase View) ─────────
  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      if (screenTrackRef.current) {
        screenTrackRef.current.stop();
        screenTrackRef.current = null;
      }
      setScreenStream(null);
      setIsScreenSharing(false);

      // Revert back to camera stream if camera was on
      try {
        if (isCamOn) {
          const camStream = await navigator.mediaDevices.getUserMedia({ video: true });
          const camTrack = camStream.getVideoTracks()[0];
          if (localStream) {
            const oldVideo = localStream.getVideoTracks()[0];
            if (oldVideo) {
              localStream.removeTrack(oldVideo);
              oldVideo.stop();
            }
            localStream.addTrack(camTrack);
            if (localVideoRef.current) localVideoRef.current.srcObject = localStream;
          }
          Object.values(peerConnections.current).forEach((pc) => {
            const sender = pc.getSenders().find((s) => s.track?.kind === "video");
            if (sender) sender.replaceTrack(camTrack);
          });
        }
      } catch (e) {
        console.error("Failed to restore camera after screen share:", e);
      }
    } else {
      try {
        const displayStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        });
        const displayTrack = displayStream.getVideoTracks()[0];
        screenTrackRef.current = displayTrack;
        setScreenStream(displayStream);
        setIsScreenSharing(true);

        if (screenVideoRef.current) {
          screenVideoRef.current.srcObject = displayStream;
        }

        displayTrack.onended = () => {
          if (screenTrackRef.current) {
            screenTrackRef.current.stop();
            screenTrackRef.current = null;
          }
          setScreenStream(null);
          setIsScreenSharing(false);
        };

        // Send screen track to peers
        Object.values(peerConnections.current).forEach((pc) => {
          const sender = pc.getSenders().find((s) => s.track?.kind === "video");
          if (sender) sender.replaceTrack(displayTrack);
        });

        success("Screen sharing started in showcase view.");
      } catch (e) {
        console.warn("Screen share cancelled or denied:", e);
      }
    }
  };

  // Bind screenStream to screenVideoRef whenever it updates
  useEffect(() => {
    if (screenVideoRef.current && screenStream) {
      screenVideoRef.current.srcObject = screenStream;
    }
  }, [screenStream]);

  // ── 10. Participant Request Admission (Waiting Room Knock) ──────
  const handleRequestAdmission = async () => {
    if (!meeting || !actualMeetingId) return;

    if (!user) {
      if (!guestName.trim() || guestName.trim().length < 2) {
        error("Please enter your name to request admission.");
        return;
      }
      if (!guestEmail.trim() || !EMAIL_REGEX.test(guestEmail.trim())) {
        error("A valid email address is required to enter this meeting.");
        return;
      }
    }

    const participantId = user?.uid || `guest_${Date.now()}`;
    const currentUserName = user?.name || guestName.trim();
    const currentUserEmail = user?.email || guestEmail.trim();

    try {
      setWaitingStatus("waiting");
      await setDoc(doc(db, "scheduledMeetings", actualMeetingId, "waitingRoom", participantId), {
        id: participantId,
        name: currentUserName,
        email: currentUserEmail,
        role: !user ? "external" : "participant",
        status: "waiting",
        requestedAt: Date.now(),
      });

      // Listen for host decision
      const unsub = onSnapshot(
        doc(db, "scheduledMeetings", actualMeetingId, "waitingRoom", participantId),
        (snap) => {
          if (snap.exists()) {
            const data = snap.data() as WaitingRoomRequest;
            if (data.status === "admitted") {
              setWaitingStatus("admitted");
              success("You have been admitted by the host!");
              doJoinMeeting(actualMeetingId, meeting);
              unsub();
            } else if (data.status === "denied") {
              setWaitingStatus("denied");
              error("Your request to join was declined by the host.");
              unsub();
            }
          }
        },
        (err) => {
          console.warn("Guest waiting listener notice:", err?.message);
        }
      );
    } catch (err: any) {
      console.error("Error requesting admission:", err);
      error("Could not send join request.");
      setWaitingStatus("idle");
    }
  };

  // ── 11. Host Admit / Deny Handlers ──────────────────────────────
  const handleAdmitParticipant = async (req: WaitingRoomRequest) => {
    try {
      await updateDoc(doc(db, "scheduledMeetings", actualMeetingId, "waitingRoom", req.id), {
        status: "admitted",
        admittedAt: Date.now(),
      });
      await recordParticipantJoin(actualMeetingId, {
        uid: req.id.startsWith("guest_") ? undefined : req.id,
        name: req.name,
        email: req.email,
        role: (req.role as any) || "participant",
        invited: true,
        joined: true,
      });
      success(`Admitted ${req.name} to the meeting`);
    } catch (err) {
      console.error("Error admitting participant:", err);
    }
  };

  const handleDenyParticipant = async (req: WaitingRoomRequest) => {
    try {
      await updateDoc(doc(db, "scheduledMeetings", actualMeetingId, "waitingRoom", req.id), {
        status: "denied",
        deniedAt: Date.now(),
      });
      success(`Declined admission for ${req.name}`);
    } catch (err) {
      console.error("Error denying participant:", err);
    }
  };

  const handleAdmitAll = async () => {
    for (const req of waitingList) {
      await handleAdmitParticipant(req);
    }
  };

  // ── 12. Live In-Meeting Chat Subscription ───────────────────────
  useEffect(() => {
    if (!joined || !actualMeetingId) return;

    const chatCol = collection(db, "scheduledMeetings", actualMeetingId, "chat");
    const q = query(chatCol, orderBy("createdAt", "asc"));

    const unsub = onSnapshot(
      q,
      (snap) => {
        const msgs: InMeetingChatMessage[] = snap.docs.map(
          (d) =>
            ({
              id: d.id,
              ...d.data(),
            } as InMeetingChatMessage)
        );
        setChatMessages(msgs);
      },
      (err) => {
        console.warn("Chat listener notice:", err?.message);
      }
    );

    return () => unsub();
  }, [joined, actualMeetingId]);

  // ── 13. Send In-Meeting Chat Message ────────────────────────────
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !actualMeetingId) return;

    try {
      const chatCol = collection(db, "scheduledMeetings", actualMeetingId, "chat");
      await addDoc(chatCol, {
        meetingId: actualMeetingId,
        senderId: user?.uid || `guest_${Date.now()}`,
        senderName: user?.name || guestName || "Guest",
        senderRole: user?.uid === meeting?.hostId ? "host" : isCoHost ? "co_host" : "participant",
        text: chatInput.trim(),
        createdAt: Date.now(),
      });
      setChatInput("");
    } catch (err) {
      console.error("Error sending message:", err);
    }
  };

  // ── 14. Emoji Reaction Broadcast ────────────────────────────────
  const sendReaction = (emoji: string) => {
    const id = Date.now().toString() + Math.random();
    const x = Math.floor(Math.random() * 60) + 20;
    setReactions((prev) => [...prev, { id, emoji, x }]);
    setShowReactionsMenu(false);

    setTimeout(() => {
      setReactions((prev) => prev.filter((r) => r.id !== id));
    }, 2400);
  };

  // ── 15. Copy Meeting Link & Code ────────────────────────────────
  const handleCopyLink = () => {
    const code = meeting?.code || actualMeetingId.slice(0, 4).toUpperCase();
    const roomUrl = `${window.location.origin}/meet/${code}`;
    navigator.clipboard.writeText(roomUrl);
    setCopiedLink(true);
    success("Meeting room URL copied to clipboard!");
    setTimeout(() => setCopiedLink(false), 3000);
  };

  const handleCopyCode = () => {
    const code = meeting?.code || actualMeetingId.slice(0, 4).toUpperCase();
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    success(`4-Digit Meeting Code (${code}) copied!`);
    setTimeout(() => setCopiedCode(false), 3000);
  };

  // ── 16. Leave Meeting Only (Keep Room Live for Everyone Else) ───
  const handleLeaveMeetingOnly = () => {
    try {
      if (localStream) {
        localStream.getTracks().forEach((t) => t.stop());
        setLocalStream(null);
      }
      if (screenTrackRef.current) {
        screenTrackRef.current.stop();
        screenTrackRef.current = null;
        setScreenStream(null);
      }
      Object.values(peerConnections.current).forEach((pc) => {
        try { pc.close(); } catch (_) {}
      });
    } catch (e) {
      console.warn("Cleanup error on leave:", e);
    }

    setShowLeaveModal(false);
    success("You have left the meeting. The room remains active and you can rejoin anytime.");
    router.push("/meetings");

    const leaveId = mySessionIdRef.current || user?.uid || guestEmail.trim();
    if (leaveId) {
      recordParticipantLeave(actualMeetingId, leaveId).catch((err) => {
        console.warn("Background recordParticipantLeave failed:", err);
      });
    }
  };

  // ── 17. Host End Meeting for All -> Closes Call, Submits Report ─
  const handleEndMeetingForAll = async () => {
    if (!meeting) return;

    try {
      if (localStream) {
        localStream.getTracks().forEach((t) => t.stop());
        setLocalStream(null);
      }
      if (screenTrackRef.current) {
        screenTrackRef.current.stop();
        screenTrackRef.current = null;
        setScreenStream(null);
      }
      Object.values(peerConnections.current).forEach((pc) => {
        try { pc.close(); } catch (_) {}
      });
    } catch (e) {
      console.warn("Cleanup error on end:", e);
    }

    setShowLeaveModal(false);

    try {
      // Immediate direct Firestore write so meeting status becomes "submitted_for_review" right away
      const docRef = doc(db, "scheduledMeetings", actualMeetingId);
      await updateDoc(docRef, {
        status: "submitted_for_review",
        actualEnd: new Date().toISOString(),
      });
    } catch (dbErr) {
      console.warn("Direct updateDoc in handleEndMeetingForAll:", dbErr);
    }

    endLiveMeeting(actualMeetingId, user?.uid || meeting.hostId).catch((err) => {
      console.warn("Background endLiveMeeting failed:", err);
    });

    success("Meeting has been ended for all participants.");
    setShowSummaryModal(true);
  };

  const handleCutCallClick = () => {
    if (hasHostControls) {
      setShowLeaveModal(true);
    } else {
      handleLeaveMeetingOnly();
    }
  };

  // ── Loading Skeleton ────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white space-y-4">
        <Loader2 size={36} className="animate-spin text-blue-500" />
        <p className="text-sm font-semibold text-slate-300">Connecting to MentorMesh Live Room...</p>
      </div>
    );
  }

  if (!meeting) return null;

  const meetingCodeDisplay = meeting.code || actualMeetingId.slice(0, 4).toUpperCase();
  const isMeetingLive = meeting.status === "live";

  // ═══════════════════════════════════════════════════════════════
  // 1. PRE-JOIN / LOBBY STAGE
  // ═══════════════════════════════════════════════════════════════
  if (!joined) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white flex flex-col justify-center items-center p-4 sm:p-8">
        <div className="w-full max-w-4xl bg-slate-900/90 backdrop-blur-md rounded-3xl border border-slate-800 shadow-2xl p-6 sm:p-10 space-y-8">
          
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-5">
            <div className="flex items-center gap-3">
              <span
                className={`w-3 h-3 rounded-full ${
                  isMeetingLive ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
                }`}
              />
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">
                  MentorMesh Live Room
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-white">{meeting.title}</h2>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-blue-300 bg-blue-950/80 px-3 py-1 rounded-full border border-blue-800/80">
                Code: {meetingCodeDisplay}
              </span>
              <span className="text-xs font-bold text-slate-400 bg-slate-800/80 px-3 py-1 rounded-full border border-slate-700">
                Online Session
              </span>
            </div>
          </div>

          {/* Body: Video Preview + Details */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            {/* Left Column: Camera Preview Box */}
            <div className="lg:col-span-7 space-y-3">
              <div className="relative w-full aspect-video bg-slate-950 rounded-2xl overflow-hidden border-2 border-slate-800 shadow-inner flex items-center justify-center">
                <video
                  ref={prejoinVideoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{ transform: "scaleX(-1)" }}
                  className={`w-full h-full object-cover ${!isCamOn ? "hidden" : ""}`}
                />

                {!isCamOn && (
                  <div className="flex flex-col items-center gap-3">
                    <Avatar
                      name={user?.name || "Participant"}
                      photoUrl={user?.profilePhoto}
                      size="lg"
                      className="w-20 h-20 text-xl ring-4 ring-slate-800"
                    />
                    <p className="text-xs font-bold text-slate-400">Camera is off</p>
                  </div>
                )}

                {/* Floating Preview Controls */}
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-slate-900/90 backdrop-blur-md px-4 py-2 rounded-full border border-slate-700/80 shadow-lg">
                  <button
                    type="button"
                    onClick={toggleMic}
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                      isMicOn
                        ? "bg-slate-800 hover:bg-slate-700 text-white"
                        : "bg-red-500 hover:bg-red-600 text-white"
                    }`}
                    title={isMicOn ? "Mute Microphone" : "Unmute Microphone"}
                  >
                    {isMicOn ? <Mic size={18} /> : <MicOff size={18} />}
                  </button>

                  <button
                    type="button"
                    onClick={toggleCam}
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                      isCamOn
                        ? "bg-slate-800 hover:bg-slate-700 text-white"
                        : "bg-red-500 hover:bg-red-600 text-white"
                    }`}
                    title={isCamOn ? "Turn Off Camera" : "Turn On Camera"}
                  >
                    {isCamOn ? <VideoIcon size={18} /> : <VideoOff size={18} />}
                  </button>
                </div>
              </div>

              {/* Permission Alert Banner */}
              {permissionError && (
                <div className="bg-amber-950/70 border border-amber-800/80 rounded-2xl p-3.5 flex items-start gap-3 text-xs text-amber-200 animate-in fade-in">
                  <AlertCircle size={18} className="text-amber-400 shrink-0 mt-0.5" />
                  <div className="flex-1 space-y-1">
                    <p className="font-medium leading-relaxed">{permissionError}</p>
                    <button
                      type="button"
                      onClick={initUserMedia}
                      disabled={retryingMedia}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-300 hover:text-white bg-amber-900/60 hover:bg-amber-800 px-2.5 py-1 rounded-lg transition-colors"
                    >
                      <RefreshCw size={12} className={retryingMedia ? "animate-spin" : ""} />
                      <span>{retryingMedia ? "Checking Devices..." : "Retry Permission"}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Meeting Info & Join / Knock Box */}
            <div className="lg:col-span-5 space-y-5">
              <div className="space-y-2">
                <p className="text-xs text-slate-400">
                  Host: <strong className="text-white">{meeting.hostName}</strong>
                </p>
                {meeting.purpose && (
                  <p className="text-xs text-slate-300 italic">"{meeting.purpose}"</p>
                )}
              </div>

              <div className="space-y-2 text-xs text-slate-300 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
                <p className="flex items-center gap-2">
                  <Calendar size={14} className="text-blue-400 shrink-0" />
                  <span>{meeting.date}</span>
                </p>
                <p className="flex items-center gap-2">
                  <Clock size={14} className="text-blue-400 shrink-0" />
                  <span>
                    {meeting.startTime} • Duration: {meeting.expectedDuration} mins
                  </span>
                </p>
                <p className="flex items-center gap-2 text-blue-300 font-mono font-semibold pt-1 border-t border-slate-800/80">
                  <span>Join Code: {meetingCodeDisplay}</span>
                </p>
              </div>

              {/* Guest Inputs if unauthenticated */}
              {!user && (
                <div className="space-y-3 bg-slate-950/70 p-4 rounded-2xl border border-slate-800">
                  <div>
                    <label className="text-[11px] font-bold text-slate-300 mb-1 block">
                      Your Full Name <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. John Doe"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-4 py-2.5 text-xs outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-300 mb-1 block">
                      Email Address <span className="text-red-400">* (Verified for entry)</span>
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. yourname@gmail.com"
                      value={guestEmail}
                      onChange={(e) => {
                        const val = e.target.value;
                        setGuestEmail(val);
                        if (val.trim() && !EMAIL_REGEX.test(val.trim())) {
                          setEmailError("Please enter a valid email format (name@example.com)");
                        } else {
                          setEmailError(null);
                        }
                      }}
                      className={`w-full bg-slate-900 border ${
                        emailError ? "border-red-500" : "border-slate-700"
                      } text-white rounded-xl px-4 py-2.5 text-xs outline-none focus:border-blue-500`}
                    />
                    {emailError ? (
                      <p className="text-[11px] text-red-400 mt-1 font-medium">{emailError}</p>
                    ) : (
                      <p className="text-[10px] text-slate-500 mt-1">
                        Only participants with a valid email ID are permitted into this meeting.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons: Host vs Staff vs Waiting Room / Knock */}
              <div className="space-y-2.5 pt-2">
                {isHost ? (
                  <Button
                    variant="primary"
                    size="lg"
                    className="w-full bg-blue-600 hover:bg-blue-700 py-3.5 text-sm font-bold shadow-lg shadow-blue-600/30 rounded-2xl flex items-center justify-center gap-2"
                    onClick={() => doJoinMeeting(actualMeetingId, meeting, true)}
                  >
                    <VideoIcon size={18} />
                    <span>{meeting.purpose?.includes("Instant") || meeting.title?.includes("Instant") ? "Start Instant Meeting" : "Start & Join as Host"}</span>
                  </Button>
                ) : isStaffOrAdmin || isMeetingLive ? (
                  <Button
                    variant="primary"
                    size="lg"
                    disabled={!user && (!guestName.trim() || !EMAIL_REGEX.test(guestEmail.trim()))}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed py-3.5 text-sm font-bold shadow-lg shadow-blue-600/30 rounded-2xl flex items-center justify-center gap-2"
                    onClick={() => doJoinMeeting(actualMeetingId, meeting)}
                  >
                    <VideoIcon size={18} />
                    <span>{isStaffOrAdmin ? "Join Meeting as Staff/Admin" : "Join now"}</span>
                  </Button>
                ) : (
                  <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 text-center space-y-3">
                    <div className="w-10 h-10 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center mx-auto">
                      <Clock size={20} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">Meeting Not Started Yet</h3>
                      <p className="text-xs text-slate-400 mt-1">
                        The host hasn't opened the room yet. Ask to join so the host can admit you.
                      </p>
                    </div>

                    {waitingStatus === "waiting" ? (
                      <div className="inline-flex items-center gap-2 text-xs font-bold text-amber-400 bg-amber-950/50 border border-amber-800/50 px-3.5 py-2 rounded-xl">
                        <Loader2 size={14} className="animate-spin" />
                        <span>Waiting for host to admit you...</span>
                      </div>
                    ) : waitingStatus === "denied" ? (
                      <div className="text-xs font-bold text-red-400 bg-red-950/50 border border-red-800/50 px-3.5 py-2 rounded-xl">
                        Host declined your request to join.
                      </div>
                    ) : (
                      <Button
                        variant="primary"
                        size="md"
                        disabled={!user && (!guestName.trim() || !EMAIL_REGEX.test(guestEmail.trim()))}
                        className="w-full bg-amber-600 hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-bold rounded-xl"
                        onClick={handleRequestAdmission}
                      >
                        Ask Host to Join
                      </Button>
                    )}
                  </div>
                )}

                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-slate-400 hover:text-white rounded-xl"
                  onClick={() => router.push("/meetings")}
                >
                  Cancel & Return to Hub
                </Button>
              </div>
            </div>

          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // 2. LIVE MEETING STAGE
  // ═══════════════════════════════════════════════════════════════
  return (
    <div className="fixed inset-0 bg-slate-950 text-white flex flex-col z-30 overflow-hidden select-none">
      
      {/* ── TOP BAR ────────────────────────────────────────────── */}
      <header className="h-14 px-4 sm:px-6 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between z-10 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
          <h2 className="font-bold text-sm sm:text-base text-white truncate" title={meeting.title}>
            {meeting.title}
          </h2>
          <span className="hidden sm:inline text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
            MentorMesh Room
          </span>
          <span className="text-xs font-mono text-emerald-400 font-bold bg-slate-950/60 px-2.5 py-0.5 rounded border border-emerald-500/20">
            {meetingDurationTimer}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* 4-Digit Meeting Code Badge */}
          <button
            type="button"
            onClick={handleCopyCode}
            className="flex items-center gap-1.5 text-xs font-mono font-bold text-blue-300 hover:text-white bg-blue-950/70 hover:bg-blue-900/80 border border-blue-500/40 px-3 py-1 rounded-xl transition cursor-pointer"
            title="Click to copy 4-digit code"
          >
            <span>Code: {meetingCodeDisplay}</span>
            {copiedCode ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
          </button>

          <Button
            size="sm"
            variant="ghost"
            onClick={handleCopyLink}
            icon={copiedLink ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            className="text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl"
          >
            {copiedLink ? "Link Copied" : "Copy Link"}
          </Button>

          {hasHostControls && (
            <button
              type="button"
              onClick={() => setActivePanel(activePanel === "hostControls" ? "none" : "hostControls")}
              className="hidden md:flex items-center gap-1.5 text-[11px] font-bold text-amber-300 bg-amber-950/60 hover:bg-amber-900/80 border border-amber-700/80 px-2.5 py-1 rounded-full transition cursor-pointer"
            >
              <Shield size={12} />
              Host Controls Active
              {waitingList.length > 0 && (
                <span className="bg-amber-500 text-slate-950 px-1.5 py-0.2 rounded-full font-black text-[10px] animate-pulse">
                  {waitingList.length}
                </span>
              )}
            </button>
          )}

          {/* Top Bar Direct End / Leave Button */}
          <Button
            size="sm"
            variant="danger"
            onClick={handleCutCallClick}
            icon={<PhoneOff size={13} />}
            className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-md shadow-red-600/20 shrink-0"
          >
            {hasHostControls ? "End / Leave Call" : "Leave Call"}
          </Button>
        </div>
      </header>

      {/* ── FLOATING HOST NOTIFICATION: KNOCK REQUESTS ────────── */}
      {hasHostControls && waitingList.length > 0 && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 border border-amber-500/70 shadow-2xl rounded-2xl p-3 sm:px-4 sm:py-2.5 flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping shrink-0" />
          <div className="text-xs">
            <span className="font-bold text-white">{waitingList[0].name}</span>
            <span className="text-slate-400 ml-1">wants to join this call</span>
          </div>
          <div className="flex items-center gap-1.5 ml-2">
            <button
              type="button"
              onClick={() => handleAdmitParticipant(waitingList[0])}
              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition cursor-pointer"
            >
              Admit
            </button>
            <button
              type="button"
              onClick={() => handleDenyParticipant(waitingList[0])}
              className="px-2.5 py-1 bg-slate-800 hover:bg-red-600 text-slate-300 hover:text-white rounded-lg text-xs font-bold transition cursor-pointer"
            >
              Deny
            </button>
            {waitingList.length > 1 && (
              <button
                type="button"
                onClick={() => setActivePanel("hostControls")}
                className="text-xs text-blue-400 hover:text-blue-300 font-semibold underline ml-1 cursor-pointer"
              >
                +{waitingList.length - 1} more
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── MAIN BODY (VIDEO GRID & DRAWERS) ───────────────────── */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* Floating Animated Emojis */}
        <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden">
          {reactions.map((r) => (
            <div
              key={r.id}
              style={{
                left: `${r.x}%`,
                bottom: "80px",
                position: "absolute",
                fontSize: "36px",
                animation: "mmFloatUp 2.4s ease-out forwards",
              }}
            >
              {r.emoji}
            </div>
          ))}
          <style>{`
            @keyframes mmFloatUp {
              0% { opacity: 0; transform: translateY(0) scale(0.6); }
              15% { opacity: 1; transform: translateY(-30px) scale(1.2); }
              80% { opacity: 0.9; transform: translateY(-240px) scale(1); }
              100% { opacity: 0; transform: translateY(-320px) scale(0.8); }
            }
          `}</style>
        </div>

        {/* Main Center Video Area: Spotlight Presentation Showcase or Standard Grid */}
        <div className="flex-1 p-3 sm:p-5 flex items-center justify-center overflow-hidden">
          {isScreenSharing ? (
            <div className="w-full h-full max-h-[82vh] flex flex-col lg:flex-row gap-4 items-stretch justify-center">
              
              {/* LARGE GOOGLE MEET SCREEN PRESENTATION SHOWCASE (Dominates ~75-80%) */}
              <div className="flex-1 relative bg-slate-950 rounded-3xl overflow-hidden border-2 border-blue-500/60 shadow-2xl flex flex-col items-center justify-center min-h-[300px]">
                <video
                  ref={screenVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-contain bg-slate-950 rounded-2xl"
                />

                {/* Google Meet Style Showcase Header / Overlay Banner */}
                <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-20 pointer-events-none">
                  <div className="flex items-center gap-2.5 bg-slate-900/95 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-blue-500/50 shadow-2xl pointer-events-auto">
                    <Monitor size={20} className="text-blue-400 animate-pulse shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-white flex items-center gap-2">
                        <span>You are presenting to everyone</span>
                        <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                      </p>
                      <p className="text-[11px] text-slate-400">Your screen is visible to all participants in this room</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={toggleScreenShare}
                    className="pointer-events-auto flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xl shadow-red-600/30 transition cursor-pointer"
                    title="Stop Screen Casting"
                  >
                    <Monitor size={15} />
                    <span>Stop presenting</span>
                  </button>
                </div>
              </div>

              {/* SIDE CAROUSEL STRIP: Participants with Profile Photos */}
              <div className="w-full lg:w-72 flex lg:flex-col gap-3 overflow-x-auto lg:overflow-y-auto shrink-0 max-h-[82vh] p-1">
                {/* Local participant card */}
                <div className="relative w-48 lg:w-full aspect-video bg-slate-900 rounded-2xl overflow-hidden border border-slate-700 shadow-md flex items-center justify-center shrink-0">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    style={{ transform: "scaleX(-1)" }}
                    className={`w-full h-full object-cover ${!isCamOn ? "hidden" : ""}`}
                  />
                  {!isCamOn && (
                    <div className="flex flex-col items-center gap-1.5">
                      <Avatar
                        name={user?.name || guestName || "You"}
                        photoUrl={user?.profilePhoto || user?.professionalPhoto}
                        size="md"
                        className="w-12 h-12 text-base ring-2 ring-slate-700"
                      />
                      <span className="text-[10px] text-slate-400 font-medium">Camera off</span>
                    </div>
                  )}
                  <div className="absolute bottom-2 left-2 flex items-center gap-1.5 bg-slate-950/80 backdrop-blur px-2.5 py-1 rounded-full text-[11px] font-bold border border-slate-700">
                    <span className="truncate max-w-[90px]">{user?.name || guestName || "You"} (You)</span>
                    {!isMicOn && <MicOff size={11} className="text-red-400" />}
                  </div>
                </div>

                {/* Remote peer cards */}
                {remoteParticipants.map((peer, idx) => (
                  <div
                    key={peer.sessionId || peer.uid || idx}
                    className="relative w-48 lg:w-full aspect-video bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 shadow-md flex items-center justify-center shrink-0"
                  >
                    <RemoteParticipantCard
                      peer={peer}
                      stream={remoteStreams[peer.sessionId || peer.uid || ""]}
                      isHost={peer.uid === meeting.hostId || peer.role === "host"}
                    />
                  </div>
                ))}
              </div>

            </div>
          ) : (
            <div
              className={`w-full h-full max-h-[82vh] transition-all flex items-center justify-center p-2 ${
                totalParticipants === 1
                  ? "max-w-4xl mx-auto"
                  : totalParticipants === 2
                  ? "max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4"
                  : totalParticipants <= 4
                  ? "max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-4"
                  : "max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto"
              }`}
            >
              {/* Local Video Tile */}
              <div className={`relative w-full aspect-video bg-slate-900 rounded-3xl overflow-hidden border-2 border-slate-700/90 shadow-2xl flex items-center justify-center ${totalParticipants === 1 ? "max-h-[76vh]" : ""}`}>
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{ transform: "scaleX(-1)" }}
                  className={`w-full h-full object-cover ${!isCamOn ? "hidden" : ""}`}
                />

                {!isCamOn && (
                  <div className="flex flex-col items-center gap-2">
                    <Avatar
                      name={user?.name || guestName || "You"}
                      photoUrl={user?.profilePhoto || user?.professionalPhoto}
                      size="lg"
                      className="w-20 h-20 text-2xl ring-4 ring-slate-800"
                    />
                    <p className="text-slate-400 text-xs font-semibold">Camera Off</p>
                  </div>
                )}

                {/* Bottom tag info */}
                <div className="absolute bottom-3.5 left-3.5 flex items-center gap-2 bg-slate-950/80 backdrop-blur-md px-3.5 py-1.5 rounded-full text-xs font-bold border border-slate-700/80">
                  <span>{user?.name || guestName || "You"} (You)</span>
                  {isHost && <span className="text-[10px] text-amber-400">★ Host</span>}
                  {!isMicOn && <MicOff size={13} className="text-red-400 ml-1" />}
                </div>

                {raisedHand && (
                  <div className="absolute top-3.5 right-3.5 bg-amber-500 text-slate-950 px-3 py-1 rounded-full text-xs font-black flex items-center gap-1.5 shadow-lg animate-bounce">
                    <Hand size={14} />
                    Hand Raised
                  </div>
                )}
              </div>

              {/* Remote Peer Cards */}
              {remoteParticipants.map((peer, idx) => {
                const peerKey = peer.sessionId || peer.uid || `peer_${idx}`;
                return (
                  <RemoteParticipantCard
                    key={peerKey}
                    peer={peer}
                    stream={remoteStreams[peer.sessionId || peer.uid || ""]}
                    isHost={peer.uid === meeting.hostId || peer.role === "host"}
                  />
                );
              })}

              {/* In-room helper banner if host or participant is alone */}
              {totalParticipants === 1 && (
                <div className="mt-4 flex flex-wrap items-center justify-center gap-3 bg-slate-900/90 backdrop-blur border border-slate-800 px-5 py-3 rounded-2xl text-xs text-slate-300 shadow-xl">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Meeting Live • Code:</span>
                    <strong className="text-blue-400 font-mono text-sm tracking-wider">{meetingCodeDisplay}</strong>
                  </div>
                  <div className="flex items-center gap-2 ml-2">
                    <Button
                      size="sm"
                      variant="outline"
                      icon={<Copy size={13} />}
                      onClick={handleCopyCode}
                      className="text-xs h-8 px-3 rounded-xl border-slate-700 hover:text-white"
                    >
                      Copy Code
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      icon={<Copy size={13} />}
                      onClick={handleCopyLink}
                      className="text-xs h-8 px-3 rounded-xl border-slate-700 hover:text-white"
                    >
                      Copy Link
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── SIDE PANEL: CHAT DRAWER ──────────────────────────── */}
        {activePanel === "chat" && (
          <div className="w-80 sm:w-96 bg-slate-900 border-l border-slate-800 flex flex-col z-40 animate-in slide-in-from-right duration-200">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare size={16} className="text-blue-400" />
                <h3 className="font-bold text-sm text-white">In-Meeting Messages</h3>
              </div>
              <button
                type="button"
                onClick={() => setActivePanel("none")}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 p-4 overflow-y-auto space-y-3">
              {chatMessages.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-12">
                  No messages yet. Say hello to everyone!
                </p>
              ) : (
                chatMessages.map((msg) => (
                  <div key={msg.id} className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-200">{msg.senderName}</span>
                      <span className="text-[10px] text-slate-500">
                        {msg.senderRole === "host" && "(Host)"}
                      </span>
                    </div>
                    <div className="bg-slate-800/80 text-xs text-slate-100 p-2.5 rounded-xl break-words">
                      {msg.text || (msg as any).message}
                    </div>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-800 flex gap-2">
              <input
                type="text"
                placeholder="Send a message to everyone..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-blue-500"
              />
              <button
                type="submit"
                className="p-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-colors cursor-pointer"
              >
                <Send size={15} />
              </button>
            </form>
          </div>
        )}

        {/* ── SIDE PANEL: PARTICIPANTS DRAWER ─────────────────── */}
        {activePanel === "participants" && (
          <div className="w-80 sm:w-96 bg-slate-900 border-l border-slate-800 flex flex-col z-40 animate-in slide-in-from-right duration-200">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users size={16} className="text-blue-400" />
                <h3 className="font-bold text-sm text-white">
                  Participants ({meeting.attendance?.length || 1})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActivePanel("none")}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 p-4 overflow-y-auto space-y-2">
              {meeting.attendance?.map((p, idx) => (
                <div
                  key={p.sessionId || p.uid || idx}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Avatar
                      name={p.name}
                      photoUrl={p.photoUrl || (p.uid === user?.uid ? user?.profilePhoto : undefined)}
                      size="sm"
                      className="w-7 h-7 text-xs bg-slate-700"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-200 truncate">{p.name}</p>
                      <span className="text-[10px] text-slate-400 capitalize">
                        {p.role} {p.joined ? "• Present" : "• Invited"}
                      </span>
                    </div>
                  </div>

                  {p.joined && (
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  )}
                </div>
              ))}
            </div>

            <div className="p-3 border-t border-slate-800 space-y-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs text-slate-300 border-slate-700 rounded-xl"
                onClick={handleCopyCode}
                icon={<Copy size={13} />}
              >
                Copy Code ({meetingCodeDisplay})
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs text-slate-300 border-slate-700 rounded-xl"
                onClick={handleCopyLink}
                icon={<Copy size={13} />}
              >
                Copy Room Link
              </Button>
            </div>
          </div>
        )}

        {/* ── SIDE PANEL: HOST CONTROLS DRAWER ────────────────── */}
        {activePanel === "hostControls" && (
          <div className="w-80 sm:w-96 bg-slate-900 border-l border-slate-800 flex flex-col z-40 animate-in slide-in-from-right duration-200">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield size={16} className="text-amber-400" />
                <h3 className="font-bold text-sm text-white">Host Controls</h3>
              </div>
              <button
                type="button"
                onClick={() => setActivePanel("none")}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 p-4 overflow-y-auto space-y-5">
              {/* 4-Character Access Code Card */}
              <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Meeting 4-Digit Code
                  </span>
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60">
                    Live
                  </span>
                </div>
                <div className="text-2xl font-black font-mono tracking-widest text-center text-blue-400 bg-slate-900 py-2.5 rounded-xl border border-slate-700/60 shadow-inner">
                  {meetingCodeDisplay}
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    icon={<Copy size={13} />}
                    onClick={handleCopyCode}
                    className="text-xs text-slate-300 border-slate-700 rounded-xl"
                  >
                    Copy Code
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    icon={<Copy size={13} />}
                    onClick={handleCopyLink}
                    className="text-xs text-slate-300 border-slate-700 rounded-xl"
                  >
                    Copy Link
                  </Button>
                </div>
              </div>

              {/* Waiting Room Requests Section */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Users size={14} className="text-amber-400" />
                    <h4 className="text-xs font-bold text-slate-200">Waiting Room Requests</h4>
                  </div>
                  {waitingList.length > 0 && (
                    <button
                      type="button"
                      onClick={handleAdmitAll}
                      className="text-[11px] text-blue-400 hover:text-blue-300 font-bold cursor-pointer"
                    >
                      Admit All ({waitingList.length})
                    </button>
                  )}
                </div>

                {waitingList.length === 0 ? (
                  <p className="text-xs text-slate-500 italic py-2">No participants currently knocking.</p>
                ) : (
                  <div className="space-y-2">
                    {waitingList.map((req) => (
                      <div
                        key={req.id}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800 border border-amber-800/40 animate-in fade-in"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white truncate">{req.name}</p>
                          <p className="text-[10px] text-slate-400 truncate">{req.email}</p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                          <button
                            type="button"
                            onClick={() => handleAdmitParticipant(req)}
                            className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition cursor-pointer"
                            title="Admit Participant"
                          >
                            <Check size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDenyParticipant(req)}
                            className="p-1.5 rounded-lg bg-slate-700 hover:bg-red-600 text-slate-300 hover:text-white transition cursor-pointer"
                            title="Deny Participant"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Host Actions */}
              <div className="space-y-2.5 pt-2 border-t border-slate-800">
                <h4 className="text-xs font-bold text-slate-200">Host Meeting Controls</h4>

                <Button
                  variant="outline"
                  size="sm"
                  icon={<VolumeX size={14} />}
                  onClick={() => {
                    success("Requested all participants to mute their microphones.");
                  }}
                  className="w-full text-xs text-slate-300 border-slate-700 rounded-xl justify-start"
                >
                  Mute All Participants
                </Button>

                <Button
                  variant="danger"
                  size="sm"
                  icon={<PhoneOff size={14} />}
                  onClick={handleCutCallClick}
                  className="w-full text-xs bg-red-600 hover:bg-red-700 rounded-xl justify-start font-bold shadow-md shadow-red-600/20"
                >
                  End or Leave Meeting
                </Button>
              </div>

              {/* Meeting Timeline Info */}
              <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-1">
                <p>
                  Scheduled: <span className="text-slate-300">{meeting.date} at {meeting.startTime}</span>
                </p>
                <p>
                  Elapsed Time: <span className="text-emerald-400 font-mono font-bold">{meetingDurationTimer}</span>
                </p>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* ── BOTTOM CONTROLS BAR ────────────────────────────────── */}
      <footer className="h-20 bg-slate-900/95 border-t border-slate-800/90 px-4 sm:px-8 flex items-center justify-between z-40 shrink-0">
        
        {/* Left: Meeting Info */}
        <div className="hidden md:flex items-center gap-2 text-xs text-slate-400 min-w-0">
          <span className="font-semibold text-white truncate max-w-[200px]">{meeting.title}</span>
          <span>•</span>
          <span className="font-mono text-blue-400 font-bold">Code: {meetingCodeDisplay}</span>
        </div>

        {/* Center: Core Call Controls */}
        <div className="flex items-center gap-2 sm:gap-3 mx-auto md:mx-0">
          
          {/* Mic */}
          <button
            type="button"
            onClick={toggleMic}
            className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
              isMicOn
                ? "bg-slate-800 hover:bg-slate-700 text-white"
                : "bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/30"
            }`}
            title={isMicOn ? "Mute Microphone" : "Unmute Microphone"}
          >
            {isMicOn ? <Mic size={20} /> : <MicOff size={20} />}
          </button>

          {/* Camera */}
          <button
            type="button"
            onClick={toggleCam}
            className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
              isCamOn
                ? "bg-slate-800 hover:bg-slate-700 text-white"
                : "bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/30"
            }`}
            title={isCamOn ? "Turn Camera Off" : "Turn Camera On"}
          >
            {isCamOn ? <VideoIcon size={20} /> : <VideoOff size={20} />}
          </button>

          {/* Screen Share (Entire Screen or Application Window) */}
          <button
            type="button"
            onClick={toggleScreenShare}
            className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
              isScreenSharing
                ? "bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/30"
                : "bg-slate-800 hover:bg-slate-700 text-white"
            }`}
            title={isScreenSharing ? "Stop Screen Share" : "Share Entire Screen or App Window"}
          >
            {isScreenSharing ? <Monitor size={20} /> : <ScreenShare size={20} />}
          </button>

          {/* Raise Hand */}
          <button
            type="button"
            onClick={() => setRaisedHand(!raisedHand)}
            className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
              raisedHand
                ? "bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-lg"
                : "bg-slate-800 hover:bg-slate-700 text-white"
            }`}
            title={raisedHand ? "Lower Hand" : "Raise Hand"}
          >
            <Hand size={20} />
          </button>

          {/* Reactions */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowReactionsMenu(!showReactionsMenu)}
              className="w-11 h-11 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center transition-all cursor-pointer"
              title="Reactions"
            >
              <Smile size={20} />
            </button>

            {showReactionsMenu && (
              <div className="absolute bottom-14 left-1/2 -translate-x-1/2 bg-slate-800 border border-slate-700 p-2 rounded-2xl shadow-xl flex gap-1.5 z-50 animate-in fade-in zoom-in-95">
                {REACTION_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => sendReaction(emoji)}
                    className="w-9 h-9 rounded-xl hover:bg-slate-700 flex items-center justify-center text-lg transition-transform hover:scale-125 cursor-pointer"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Chat Toggle */}
          <button
            type="button"
            onClick={() => setActivePanel(activePanel === "chat" ? "none" : "chat")}
            className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
              activePanel === "chat"
                ? "bg-blue-600 text-white"
                : "bg-slate-800 hover:bg-slate-700 text-white"
            }`}
            title="Chat"
          >
            <MessageSquare size={20} />
          </button>

          {/* Participants Toggle */}
          <button
            type="button"
            onClick={() => setActivePanel(activePanel === "participants" ? "none" : "participants")}
            className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
              activePanel === "participants"
                ? "bg-blue-600 text-white"
                : "bg-slate-800 hover:bg-slate-700 text-white"
            }`}
            title="Participants"
          >
            <Users size={20} />
          </button>

          {/* Host Controls Toggle */}
          {hasHostControls && (
            <button
              type="button"
              onClick={() => setActivePanel(activePanel === "hostControls" ? "none" : "hostControls")}
              className={`relative w-11 h-11 rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
                activePanel === "hostControls"
                  ? "bg-amber-500 text-slate-950 font-bold shadow-lg"
                  : "bg-slate-800 hover:bg-slate-700 text-amber-400"
              }`}
              title="Host Controls"
            >
              <Shield size={20} />
              {waitingList.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center animate-bounce">
                  {waitingList.length}
                </span>
              )}
            </button>
          )}
        </div>

        {/* Right: End / Leave Button */}
        <div className="flex items-center gap-2">
          {hasHostControls ? (
            <Button
              variant="danger"
              size="md"
              icon={<PhoneOff size={16} />}
              onClick={handleCutCallClick}
              className="bg-red-600 hover:bg-red-700 font-bold px-4 py-2.5 rounded-2xl shadow-md shadow-red-600/20 text-xs sm:text-sm"
            >
              End / Leave Call
            </Button>
          ) : (
            <Button
              variant="danger"
              size="md"
              icon={<LogOut size={16} />}
              onClick={handleLeaveMeetingOnly}
              className="bg-red-600/80 hover:bg-red-600 font-bold px-4 py-2.5 rounded-2xl text-xs sm:text-sm"
            >
              Leave Call
            </Button>
          )}
        </div>

      </footer>

      {/* ── 3. HOST POST-MEETING SUMMARY MODAL ────────────────── */}
      {showSummaryModal && (
        <PostMeetingSummaryModal
          open={showSummaryModal}
          meetingId={actualMeetingId}
          meetingTitle={meeting.title}
          onClose={() => {
            setShowSummaryModal(false);
            router.push("/meetings");
          }}
        />
      )}

      {/* ── 4. HOST LEAVE OR END MEETING MODAL ────────────────── */}
      {showLeaveModal && (
        <Modal
          open={showLeaveModal}
          onClose={() => setShowLeaveModal(false)}
          title="Leave or End Meeting"
        >
          <div className="space-y-4 py-2">
            <p className="text-xs text-slate-400">
              You are hosting <strong className="text-white">{meeting.title}</strong>. Choose how you want to exit this call:
            </p>

            <div className="grid grid-cols-1 gap-3 pt-1">
              {/* Option 1: End Meeting for Everyone */}
              <button
                type="button"
                onClick={handleEndMeetingForAll}
                className="w-full text-left p-4 rounded-2xl bg-red-950/40 hover:bg-red-950/70 border border-red-800/80 transition-all flex items-start gap-3.5 group cursor-pointer shadow-sm"
              >
                <div className="w-10 h-10 rounded-xl bg-red-600/20 group-hover:bg-red-600 text-red-400 group-hover:text-white flex items-center justify-center shrink-0 transition-colors">
                  <PhoneOff size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-white group-hover:text-red-300 transition-colors">
                      End Meeting for All
                    </h4>
                    <span className="text-[10px] font-bold text-red-400 bg-red-950 px-2 py-0.5 rounded border border-red-800">
                      Concludes Session
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Disconnect all participants immediately, conclude the call, compile attendance duration records, and submit the meeting report for review.
                  </p>
                </div>
              </button>

              {/* Option 2: Leave Meeting Only */}
              <button
                type="button"
                onClick={handleLeaveMeetingOnly}
                className="w-full text-left p-4 rounded-2xl bg-slate-800/50 hover:bg-slate-800 border border-slate-700 transition-all flex items-start gap-3.5 group cursor-pointer shadow-sm"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-600/20 group-hover:bg-blue-600 text-blue-400 group-hover:text-white flex items-center justify-center shrink-0 transition-colors">
                  <LogOut size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-white group-hover:text-blue-300 transition-colors">
                      Leave Meeting Only
                    </h4>
                    <span className="text-[10px] font-bold text-blue-400 bg-blue-950 px-2 py-0.5 rounded border border-blue-800">
                      Room Remains Live
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Leave the call yourself. The meeting will remain moving and live so participants can continue or members can cut and come later.
                  </p>
                </div>
              </button>
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowLeaveModal(false)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Cancel & Stay in Call
              </Button>
            </div>
          </div>
        </Modal>
      )}

    </div>
  );
}
