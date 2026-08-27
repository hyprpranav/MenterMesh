import { getAllUsers } from "./firebase/firestore";
import type { User, Notification } from "@/types";

function parseDate(d: string | undefined): Date | null {
    if (!d) return null;
    const parts = d.split(/[-/.]/);
    if (parts.length === 3) {
        if (parts[0].length === 4) {
            return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        } else {
            return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
        }
    }
    const val = new Date(d);
    return isNaN(val.getTime()) ? null : val;
}

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
            const dob = parseDate(u.dateOfBirth);
            if (!dob) return;

            const bMonth = dob.getMonth();
            const bDate = dob.getDate();

            const bdayThisYear = new Date(today.getFullYear(), bMonth, bDate);
            if (bdayThisYear.getTime() < today.getTime()) {
                bdayThisYear.setFullYear(today.getFullYear() + 1);
            }

            const diffMs = bdayThisYear.getTime() - today.getTime();
            const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

            if (diffDays >= 0 && diffDays <= 4) {
                let title = "";
                let message = "";
                const ageToTurn = bdayThisYear.getFullYear() - dob.getFullYear();

                if (diffDays === 0) {
                    title = `🎂 It is ${u.name}'s Birthday Today!`;
                    message = `${u.name} has turned ${ageToTurn} today! Tap here to send a birthday wish. 🎉`;
                } else {
                    title = `🎈 ${u.name}'s Birthday in ${diffDays} ${diffDays === 1 ? 'Day' : 'Days'}!`;
                    message = `Still ${diffDays} ${diffDays === 1 ? 'day' : 'days'} left for ${u.name} (Reg: ${u.registerNumber || '-'}) to turn ${ageToTurn}!`;
                }

                const contactLink = u.phone
                    ? `https://wa.me/${u.phone.replace(/\D/g, "")}?text=Happy%20Birthday%20${encodeURIComponent(u.name)}!%20🎂`
                    : `mailto:${u.collegeEmail || u.email}?subject=Happy%20Birthday!&body=Happy%20Birthday%20${encodeURIComponent(u.name)}!`;

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
                    createdAt: new Date(today.getTime() + (5 - diffDays) * 1000).toISOString(),
                });
            }
        });

        cacheBirthdays = virtualNotifs;
        lastCacheTime = now;
    }

    return cacheBirthdays.filter(n => {
        if (n.relatedId === currentUser.uid) return false;
        return true;
    }).map(n => ({
        ...n,
        recipientId: currentUser.uid,
        read: isVirtualNotificationRead(n.id)
    }));
}

export async function getTodayBirthdays(): Promise<User[]> {
    const users = await getAllUsers();
    const today = new Date();

    return users.filter(u => {
        const dob = parseDate(u.dateOfBirth);
        if (!dob) return false;
        return dob.getMonth() === today.getMonth() && dob.getDate() === today.getDate();
    });
}

