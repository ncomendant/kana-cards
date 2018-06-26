export class SrsManager {
    public static srsBase = 5;

    public static calculateProblemWorth(mastery:number, nextDue:number):number {
        let now:number = new Date().getTime()/1000;
        let gap:number = Math.pow(SrsManager.srsBase, mastery);
        let lastDue:number = nextDue - gap;
        let worth:number = (now-lastDue)/gap;
        if (worth > 1) worth = 1;
        return worth;
    }

    public static calculateNextDue(mastery:number):number {
        let now:number = new Date().getTime()/1000;
        let gap:number = SrsManager.calculateNextGap(mastery);
        return now+gap;
    }

    public static calculateNextGap(mastery:number):number {
        return Math.pow(SrsManager.srsBase, mastery);
    }

    private constructor(){}
}