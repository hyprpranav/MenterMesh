// src/app/api/meetings/route.ts
// ============================================================
// MentorMesh — Secure Meeting API Route (Server-Side Admin SDK)
// Bypasses client-side permission restrictions for instant meetings,
// scheduled sessions, attendance auditing, and staff notifications.
// ============================================================
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

function generateMeetingCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const codeOrId = searchParams.get("id");

    if (codeOrId) {
      const docSnap = await adminDb.collection("scheduledMeetings").doc(codeOrId).get();
      if (docSnap.exists) {
        return NextResponse.json({ id: docSnap.id, ...docSnap.data() });
      }
      const querySnap = await adminDb
        .collection("scheduledMeetings")
        .where("code", "==", codeOrId.toUpperCase())
        .limit(1)
        .get();
      if (!querySnap.empty) {
        const d = querySnap.docs[0];
        return NextResponse.json({ id: d.id, ...d.data() });
      }
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const snap = await adminDb
      .collection("scheduledMeetings")
      .orderBy("createdAt", "desc")
      .limit(60)
      .get();
    const meetings = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return NextResponse.json({ meetings });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { meetingData } = body;

    if (!meetingData || !meetingData.hostId) {
      return NextResponse.json(
        { error: "Missing required meeting payload." },
        { status: 400 }
      );
    }

    const code = meetingData.code || generateMeetingCode();
    const now = new Date().toISOString();

    const cleanData: Record<string, any> = {
      ...meetingData,
      code,
      submittedBy: meetingData.hostId,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    // Remove any undefined values
    Object.keys(cleanData).forEach((key) => {
      if (cleanData[key] === undefined) {
        delete cleanData[key];
      }
    });

    const docRef = await adminDb.collection("scheduledMeetings").add(cleanData);

    // Notify invited participants
    if (meetingData.participantIds && meetingData.participantIds.length > 0) {
      const title = `New Meeting Scheduled: ${meetingData.title}`;
      const message = `Hosted by ${meetingData.hostName} on ${meetingData.date} at ${meetingData.startTime} (${meetingData.expectedDuration} mins). Code: ${code}. You have been invited.`;
      
      for (const participantId of meetingData.participantIds) {
        if (participantId === meetingData.hostId) continue;
        try {
          await adminDb.collection("notifications").add({
            recipientId: participantId,
            title,
            message,
            type: "meeting",
            read: false,
            priority: "high",
            link: `/meet/${code}`,
            createdAt: FieldValue.serverTimestamp(),
          });
        } catch (e) {
          console.warn("Failed to notify participant via admin:", participantId, e);
        }
      }
    }

    // Notify staff and master users
    try {
      const staffSnap = await adminDb
        .collection("users")
        .where("role", "in", ["staff", "master"])
        .get();

      const staffTitle = `Live / Scheduled Meeting: ${meetingData.title}`;
      const staffMsg = `Hosted by ${meetingData.hostName} (Code: ${code}). Staff & Admin can join directly at any time.`;

      for (const staffDoc of staffSnap.docs) {
        if (staffDoc.id === meetingData.hostId) continue;
        await adminDb.collection("notifications").add({
          recipientId: staffDoc.id,
          title: staffTitle,
          message: staffMsg,
          type: "meeting",
          read: false,
          priority: "high",
          link: `/meet/${code}`,
          createdAt: FieldValue.serverTimestamp(),
        });
      }
    } catch (e) {
      console.warn("Failed to notify staff via admin:", e);
    }

    return NextResponse.json({
      success: true,
      id: docRef.id,
      code,
      meetingLink: `${req.nextUrl.origin}/meet/${code}`,
    });
  } catch (err: any) {
    console.error("Error creating meeting in /api/meetings:", err);
    return NextResponse.json(
      { error: err.message || "Failed to create meeting." },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { meetingId, action, updates, participant, hostId } = body;

    if (!meetingId) {
      return NextResponse.json({ error: "meetingId is required" }, { status: 400 });
    }

    const docRef = adminDb.collection("scheduledMeetings").doc(meetingId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }

    const meeting = docSnap.data() as any;
    const now = new Date().toISOString();

    if (action === "join" && participant) {
      const currentAttendance = meeting.attendance || [];
      const index = currentAttendance.findIndex(
        (p: any) =>
          (participant.uid && p.uid === participant.uid) ||
          (participant.email && p.email === participant.email)
      );

      let updatedList = [...currentAttendance];
      if (index >= 0) {
        updatedList[index] = {
          ...updatedList[index],
          joined: true,
          joinTime: updatedList[index].joinTime || now,
          status: "in_meeting",
        };
      } else {
        updatedList.push({
          uid: participant.uid || "",
          name: participant.name || "Guest",
          email: participant.email || "",
          role: participant.role || "participant",
          invited: participant.invited ?? false,
          joined: true,
          joinTime: now,
          status: "in_meeting",
        });
      }

      const patch: any = {
        attendance: updatedList,
        attendeeCount: updatedList.filter((p: any) => p.joined).length,
        updatedAt: FieldValue.serverTimestamp(),
      };

      if (meeting.status === "scheduled" || meeting.status === "starting_soon") {
        patch.status = "live";
        patch.actualStart = now;
      }

      await docRef.update(patch);
      return NextResponse.json({ success: true });
    }

    if (action === "leave" && participant?.uid) {
      const currentAttendance = meeting.attendance || [];
      const updatedList = currentAttendance.map((p: any) => {
        if (p.uid === participant.uid || p.email === participant.email) {
          const joinMs = p.joinTime ? new Date(p.joinTime).getTime() : Date.now();
          const leaveMs = Date.now();
          const durationMin = Math.max(1, Math.round((leaveMs - joinMs) / (1000 * 60)));
          return {
            ...p,
            leaveTime: now,
            durationMinutes: durationMin,
            status: "left",
          };
        }
        return p;
      });

      await docRef.update({
        attendance: updatedList,
        updatedAt: FieldValue.serverTimestamp(),
      });
      return NextResponse.json({ success: true });
    }

    if (action === "end") {
      const startMs = meeting.actualStart ? new Date(meeting.actualStart).getTime() : Date.now();
      const endMs = Date.now();
      const actualDurationMinutes = Math.max(1, Math.round((endMs - startMs) / (1000 * 60)));

      const existingAttendance = meeting.attendance || [];
      const joinedUids = new Set(existingAttendance.filter((p: any) => p.joined).map((p: any) => p.uid || p.email));

      const updatedAttendance = existingAttendance.map((p: any) => {
        if (!p.leaveTime && p.joined) {
          const pJoinMs = p.joinTime ? new Date(p.joinTime).getTime() : startMs;
          return {
            ...p,
            leaveTime: now,
            durationMinutes: Math.max(1, Math.round((endMs - pJoinMs) / (1000 * 60))),
            status: "present",
          };
        } else if (p.joined) {
          return {
            ...p,
            status: "present",
          };
        }
        return p;
      });

      if (meeting.participantIds && meeting.participantNames) {
        meeting.participantIds.forEach((pid: string, idx: number) => {
          if (!joinedUids.has(pid) && pid !== meeting.hostId) {
            const pName = meeting.participantNames[idx] || "Invited Student";
            const alreadyIn = updatedAttendance.some((p: any) => p.uid === pid);
            if (!alreadyIn) {
              updatedAttendance.push({
                uid: pid,
                name: pName,
                email: "",
                role: "participant",
                invited: true,
                joined: false,
                status: "absent",
              });
            }
          }
        });
      }

      await docRef.update({
        status: "submitted_for_review",
        actualEnd: now,
        actualDurationMinutes,
        attendance: updatedAttendance,
        updatedAt: FieldValue.serverTimestamp(),
      });

      // Notify staff
      try {
        const staffSnap = await adminDb.collection("users").where("role", "in", ["staff", "master"]).get();
        const reviewTitle = `Meeting Ended & Report Ready: ${meeting.title}`;
        const presentCount = updatedAttendance.filter((p: any) => p.status === "present" || p.joined).length;
        const reviewMsg = `Hosted by ${meeting.hostName}. ${presentCount} attended. Review attendance breakdown and approve.`;

        for (const staffDoc of staffSnap.docs) {
          await adminDb.collection("notifications").add({
            recipientId: staffDoc.id,
            title: reviewTitle,
            message: reviewMsg,
            type: "meeting",
            read: false,
            priority: "high",
            link: `/meetings/live/${meetingId}/review`,
            createdAt: FieldValue.serverTimestamp(),
          });
        }
      } catch (err) {
        console.warn("Failed to notify staff via admin on end meeting:", err);
      }

      return NextResponse.json({ success: true });
    }

    if (action === "submit_summary") {
      const summaryPayload = updates || {};
      await docRef.update({
        ...summaryPayload,
        status: "submitted_for_review",
        summarySubmittedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      try {
        const staffSnap = await adminDb.collection("users").where("role", "in", ["staff", "master"]).get();
        for (const staffDoc of staffSnap.docs) {
          await adminDb.collection("notifications").add({
            recipientId: staffDoc.id,
            title: "Meeting Report Submitted",
            message: `Meeting '${meeting.title}' report has been submitted by ${meeting.hostName} for review.`,
            type: "meeting",
            read: false,
            priority: "high",
            link: `/meetings/live/${meetingId}/review`,
            createdAt: FieldValue.serverTimestamp(),
          });
        }
      } catch (err) {
        console.warn("Failed to notify staff about summary via admin:", err);
      }

      return NextResponse.json({ success: true });
    }

    if (action === "review") {
      const { reviewerId, reviewerName, decision, feedback } = body;
      const reviewUpdates: Record<string, any> = {
        status: decision,
        reviewedBy: reviewerId,
        reviewedByName: reviewerName,
        reviewedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };
      if (feedback) reviewUpdates.reviewFeedback = feedback;

      await docRef.update(reviewUpdates);

      // Notify the host of the decision
      if (meeting.hostId) {
        try {
          await adminDb.collection("notifications").add({
            recipientId: meeting.hostId,
            title: `Meeting Report ${decision === "approved" ? "Approved" : "Requires Attention"}`,
            message: `Your meeting report for '${meeting.title}' was reviewed by ${reviewerName}. Decision: ${decision.toUpperCase()}.`,
            type: "meeting",
            read: false,
            priority: "high",
            link: `/meetings/live/${meetingId}/review`,
            createdAt: FieldValue.serverTimestamp(),
          });
        } catch (err) {
          console.warn("Failed to notify host of review decision:", err);
        }
      }

      return NextResponse.json({ success: true });
    }

    if (updates) {
      await docRef.update({
        ...updates,
        updatedAt: FieldValue.serverTimestamp(),
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    console.error("Error updating meeting in /api/meetings:", err);
    return NextResponse.json(
      { error: err.message || "Failed to update meeting." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const meetingId = searchParams.get("id");
    if (!meetingId) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }
    await adminDb.collection("scheduledMeetings").doc(meetingId).delete();
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

