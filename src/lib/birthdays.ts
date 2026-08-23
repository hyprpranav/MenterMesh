import { getAllUsers } from "./firebase/firestore";
import type { User, Notification } from "@/types";

let cacheBirthdays: Notification[] | null = null;
let lastCacheTime = 0;
const CACHE_DURATION = 1000 * 60 * 30; // 30 minutes

export function markVirtualNotificationRead(id: string) {
    if (typeof window !== "undefined") {
        const readIdsObj = JSON.parse(localStorage.getItem("mm_bday_reads") || "{}");
        readIdsObj[id] = true;
        localStorage.setItem("mm_bday_reads", JSON.stringify(readIdsObj));
    }
}

export function markAllVirtualNotificationsRead() {
    if (typeof window !== "undefined") {
        localStorage.setItem("mm_bday_reads_all", Date.now().toString());
    }
}

function isVirtualNotificationRead(id: string): boolean {
    if (typeof window !== "undefined") {
        const readAllTime = localStorage.getItem("mm_bday_reads_all");
        if (readAllTime) {
            // if they clicked mark all read recently, consider it read. 
            // For exactness, we can just clear cache, this is a coarse approach.
        }
        const readIdsObj = JSON.parse(localStorage.getItem("mm_bday_reads") || "{}");
        return !!readIdsObj[id];
    }
    return false;
}

export async function getUpcomingBirthdays(currentUser: User): Promise<Notification[]> {
    const now = Date.now();
    if (!cacheBirthdays || (now - lastCacheTime > CACHE_DURATION)) {
        const users = await getAllUsers();
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const virtualNotifs: Notification[] = [];

        users.forEach((u) => {
            if (!u.dateOfBirth) return;
            const dob = new Date(u.dateOfBirth);
            if (isNaN(dob.getTime())) return;

            const bMonth = dob.getMonth();
            const bDate = dob.getDate();
            const turningAge = today.getFullYear() - dob.getFullYear() + 1;

            const bdayThisYear = new Date(today.getFullYear(), bMonth, bDate);
            if (bdayThisYear.getTime() < today.getTime()) {
                bdayThisYear.setFullYear(today.getFullYear() + 1);
            }

            const diffMs = bdayThisYear.getTime() - today.getTime();
            const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

            // Show for 5 days before + on the day
            if (diffDays >= 0 && diffDays <= 5) {
                // Self notification on the birthday day
                if (diffDays === 0) {
                    virtualNotifs.push({
                        id: `bday_self_${u.uid}_${today.getFullYear()}`,
                        recipientId: u.uid,
                        title: `🎉 Happy ${turningAge}th Birthday, ${u.name.split(" ")[0]}!`,
                        message: "Warm wishes from the entire MentorMesh team, developers, and faculty! Have an amazing day! 🎂",
                        type: "birthday",
                        read: false,
                        priority: "high",
                        createdAt: today.toISOString(),
                    });
                }

                // Notification for everyone else
                let title = "";
                let message = "";
                const contactLink = u.phone
                    ? `https://wa.me/${u.phone.replace(/\D/g, "")}?text=Happy%20Birthday%20${encodeURIComponent(u.name)}!%20🎂`
                    : `mailto:${u.collegeEmail || u.email}?subject=Happy%20Birthday!&body=Happy%20Birthday%20${encodeURIComponent(u.name)}!`;

                if (diffDays === 0) {
                    title = `🎂 It's ${u.name}'s Birthday Today!`;
                    message = `${u.name} is turning ${turningAge} today! Tap 'Wish Now' to send your birthday message. 🎊`;
                } else if (diffDays === 1) {
                    title = `🎈 ${u.name}'s Birthday is Tomorrow!`;
                    message = `Get ready to wish ${u.name} an amazing ${turningAge}th birthday tomorrow!`;
                } else {
                    title = `🎁 ${u.name}'s Birthday in ${diffDays} Days!`;
                    message = `${u.name} is turning ${turningAge} in ${diffDays} days. Don't forget to wish them!`;
                }

                virtualNotifs.push({
                    id: `bday_other_${u.uid}_${today.getFullYear()}_${diffDays}`,
                    recipientId: "all",
                    relatedId: u.uid,
                    title,
                    message,
                    type: "birthday",
                    read: false,
                    priority: diffDays <= 1 ? "high" : "normal",
                    link: contactLink,
                    createdAt: new Date(today.getTime() + (6 - diffDays) * 1000).toISOString(),
                });
            }
        });

        cacheBirthdays = virtualNotifs;
        lastCacheTime = now;
    }

    return cacheBirthdays.filter(n => {
        if (n.recipientId === currentUser.uid) return true;
        if (n.recipientId === "all" && n.relatedId !== currentUser.uid) return true;
        return false;
    }).map(n => ({
        ...n,
        recipientId: currentUser.uid,
        read: isVirtualNotificationRead(n.id)
    }));
}
