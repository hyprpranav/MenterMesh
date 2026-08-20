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

            const bdayThisYear = new Date(today.getFullYear(), bMonth, bDate);
            if (bdayThisYear.getTime() < today.getTime()) {
                bdayThisYear.setFullYear(today.getFullYear() + 1);
            }

            const diffMs = bdayThisYear.getTime() - today.getTime();
            const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

            if (diffDays >= 0 && diffDays <= 2) {
                if (diffDays === 0) {
                    virtualNotifs.push({
                        id: `bday_self_${u.uid}_${today.getFullYear()}`,
                        recipientId: u.uid,
                        title: "Happy Birthday! 🎉",
                        message: "Greetings and best wishes from MentorMesh, Developers, and Staff!",
                        type: "birthday",
                        read: false,
                        priority: "high",
                        createdAt: today.toISOString(),
                    });
                }

                let title = "";
                let message = "";
                if (diffDays === 0) {
                    title = `It's ${u.name}'s Birthday Today! 🎂`;
                    message = `Send ${u.name} your birthday wishes!`;
                } else {
                    const dayWord = diffDays === 1 ? "tomorrow" : "in 2 days";
                    title = `${u.name}'s Birthday is ${dayWord}! 🎈`;
                    message = `Get ready to wish ${u.name} a happy birthday!`;
                }

                const contactLink = u.phone
                    ? `https://wa.me/${u.phone.replace(/\D/g, "")}?text=Happy%20Birthday%20${encodeURIComponent(u.name)}!`
                    : `mailto:${u.collegeEmail || u.email}?subject=Happy%20Birthday!&body=Happy%20Birthday%20${encodeURIComponent(u.name)}!`;

                virtualNotifs.push({
                    id: `bday_other_${u.uid}_${today.getFullYear()}_${diffDays}`,
                    recipientId: "all",
                    relatedId: u.uid,
                    title: title,
                    message: message,
                    type: "birthday",
                    read: false,
                    priority: "normal",
                    link: contactLink,
                    createdAt: new Date(today.getTime() + 1000).toISOString(),
                });
            }
        });

        cacheBirthdays = virtualNotifs;
        lastCacheTime = now;
    }

    // filter & set read status on the fly
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
