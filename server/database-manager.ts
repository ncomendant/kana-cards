import { Config } from "./config";
import { Util } from "./util";
import { Problem } from "../study-amigo-shared/problem";
import { SrsManager } from "./srs-manager";
import { VoiceSynthesizer } from "./voice-synthesizer";

declare function require(moduleName:string):any;


let mysql:any = require('mysql');

export class DatabaseManager {

    private pool:any;

    public constructor() {
        this.pool = mysql.createPool({
            connectionLimit : 100,
            host : Config.DB_HOST,
            user : Config.DB_USERNAME,
            password : Config.DB_PASSWORD,
            database : Config.DB_NAME
        });
    }

    private async query(sql, data:any[] = null):Promise<any> {
        return new Promise((accept, reject) => {
            this.pool.query(sql, data, function(err:any, res:any[], fields:any){
                if (err) reject(err);
                else accept(res);
            });
        });
    }

    public async validateLogin(username:string, password:string):Promise<boolean> {
        const sql:string = 'SELECT * FROM users WHERE username=?';
        const res = await this.query(sql, [username]);
        if (res.length > 0) {
            const salt:string = res[0].salt;
            const hashedPassword:string = res[0].password;
            return (hashedPassword === Util.hashPassword(salt, password));
        } else {
            return false;
        }
    }

    public async insertUser(username:string, password:string):Promise<string> {
        const salt:string = Util.generateToken(8);
        const hashedPassword:string = Util.hashPassword(salt, password);
        const sql:string = 'INSERT INTO users (username, password, salt) VALUES(?, ?, ?)';
        try {
            await this.query(sql, [username, hashedPassword, salt]);
            return null;
        } catch (e) {
            if (e['code'] === 'ER_DUP_ENTRY') return "Username is not available.";
            else throw new Error(e);
        }
    }

    public async getProblem(username:string):Promise<Problem> {
        let problemData:ProblemData = await this.fetchProblemData(username);
        if (!problemData) return null;
        return await this.generateProblem(problemData);
    }

    public async updateMastery(username:string, cardId:string, mastery:number):Promise<void> {
        const nextDue:number = SrsManager.calculateNextDue(mastery);
        const sql:string = 'UPDATE masteries SET value=?, nextDue=? WHERE username=? AND cardId=?';
        await this.query(sql, [mastery, nextDue, username, cardId]);
    }

    private async generateProblem(problemData:ProblemData):Promise<Problem> {
        const problem:Problem = new Problem();
        problem.id = problemData.spanish;
        problem.mastery = problemData.mastery;
        problem.worth = SrsManager.calculateProblemWorth(problemData.mastery, problemData.nextDue);

        let answer:string = null;
        let words:string[] = null;
        if (Math.random() < 0.5) { //Spanish -> English
            problem.question = problemData.spanish;
            problem.questionVoice = VoiceSynthesizer.ES_SPANISH;
            problem.answerVoice = VoiceSynthesizer.US_MALE_B;
            answer = problemData.english;
            words = await this.fetchRandomWords("english", 4);
        } else { //English -> Spanish
            problem.question = problemData.english;
            problem.questionVoice = VoiceSynthesizer.US_MALE_B;
            problem.answerVoice = VoiceSynthesizer.ES_SPANISH;
            answer = problemData.spanish;
            words = await this.fetchRandomWords("spanish", 4);
        }
        problem.choices = words;
        problem.answerIndex = this.finalizeChoices(problem.choices, answer);
        return problem;
    }

    private async fetchRandomWords(fieldName:string, length:number):Promise<string[]> {
        const sql:string = `SELECT ${fieldName} FROM vocabulary ORDER BY RAND() LIMIT ${length}`;
        let words:string[] = (await this.query(sql)).map(x => x[fieldName]);
        return words;
    }

    private finalizeChoices(choices:string[], answer:string):number {
        if (choices.indexOf(answer) < 0) choices[0] = answer;
        Util.shuffle(choices);
        return (choices.indexOf(answer));
    }

    private async fetchProblemData(username:string):Promise<ProblemData> {
        let problemData:ProblemData = await this.fetchRandomDueCard(username);
        if (problemData) return problemData;
        problemData = await this.fetchNewCard(username);
        if (problemData) return problemData;
        problemData = await this.fetchNextDueCard(username);
        return problemData;
    }

    private async fetchCard(endingSql:string, data:any[]):Promise<ProblemData> {
        let sql:string = 'SELECT vocabulary.spanish, vocabulary.english, masteries.value as mastery, masteries.nextDue FROM vocabulary LEFT JOIN masteries ON vocabulary.spanish=masteries.cardId ';
        sql += endingSql;
        const res:any[] = await this.query(sql, data);
        if (res.length > 0) {
            const {spanish, english, mastery, nextDue} = res[0];
            return new ProblemData(spanish, english, mastery, nextDue);
        } else {
            return null;
        }
    }

    private async fetchRandomDueCard(username:string):Promise<ProblemData> {
        let now:number = new Date().getTime()/1000;
        return await this.fetchCard('WHERE username=? AND nextDue<=? ORDER BY RAND() LIMIT 1', [username, now]);
    }

    private async fetchNewCard(username:string):Promise<ProblemData> {
        let problemData:ProblemData = await this.fetchCard('AND masteries.username=? WHERE masteries.value IS NULL ORDER BY RAND() LIMIT 1', [username]);
        if (problemData == null) return null;

        problemData.mastery = 1;
        problemData.nextDue = 0;

        let sql:string = 'INSERT INTO masteries (username, cardId, value, nextDue) VALUES (?, ?, ?, ?)';
        await this.query(sql, [username, problemData.spanish, problemData.mastery, problemData.nextDue]);

        return problemData;
    }

    private async fetchNextDueCard(username:string):Promise<ProblemData> {
        return await this.fetchCard('AND masteries.username=? ORDER BY nextDue ASC LIMIT 1', [username]);
    }
}

class ProblemData {
    public constructor(public spanish:string, public english:string, public mastery:number, public nextDue:number){}
}