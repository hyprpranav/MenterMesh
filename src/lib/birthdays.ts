import { getAllUsers } from "./firebase/firestore";
import type { User } from "@/types";

export async function getTodayBirthdays(): Promise<User[]> {
    const users = await getAllUsers();
    const today = new Date();
    
    return users.filter(u => {
        if (!u.dateOfBirth) return false;
        const dob = new Date(u.dateOfBirth);
        if (isNaN(dob.getTime())) return false;
        return dob.getMonth() === today.getMonth() && dob.getDate() === today.getDate();
    });
}

