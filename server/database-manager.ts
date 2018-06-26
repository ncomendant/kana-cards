import { Config } from "./config";
import { Util } from "./util";
import { Problem } from "../kana-cards-shared/problem";
import { KanaManager } from "./kana-manager";

declare function require(moduleName:string):any;


let mysql:any = require('mysql');

export class DatabaseManager {

    private static readonly SRS_BASE:number = 5;

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

    public validateLogin(username:string, password:string, callback:(successful:boolean) => void):void {
        let sql:string = 'SELECT * FROM users WHERE username=?';
        this.pool.query(sql, [username], function(err:any, res:any[], fields:any) {
            if (err != null) throw new Error(err);
            if (res.length > 0) {
                let salt:string = res[0]['salt'];
                let hashedPassword:string = res[0]['password'];
                if (hashedPassword === this.util.hashPassword(salt, password)) { //password is correct
                    callback(true);
                } else {
                    callback(false);
                }
            } else { // User not found
                callback(false);
            }
        });
    }

    public insertUser(username:string, password:string, callback:(err:string) => void):void {
        let salt:string = Util.generateToken(8);
        let hashedPassword:string = Util.hashPassword(salt, password);
        let sql:string = 'INSERT INTO USERS (username, password, salt) VALUES(?, ?, ?)';
        this.pool.query(sql, [username, hashedPassword, salt], (err:any, res:any[], fields:any) => {
            if (err == null) callback(null)
            else if (err['code'] === 'ER_DUP_ENTRY') callback("Username is not available.");
            else throw new Error(err);
        });
    }

    public getProblem(username:string, callback:(problem:Problem) => void):void {
        this.pool.getConnection((err:any, connection:any) => {
            this.fetchProblemData(username, connection, (problemData:ProblemData) => {
                if (problemData != null) {
                    this.generateProblem(problemData, connection, (problem:Problem) => {
                        connection.release();
                        callback(problem);
                    });
                } else {
                    connection.release();
                    callback(null);
                }
            });
        });
    }

    private generateProblem(problemData:ProblemData, connection:any, callback:(problem:Problem) => void):void {
        let problem:Problem = new Problem();
        problem.id = problemData.id;
        problem.worth = this.calculateWorth(problemData.mastery, problemData.nextDue);
        if (problemData.type === "kana") {
            if (Math.random() < 0.5) { //kana -> romaji
                problem.question = problemData.value;
                let answer:string = KanaManager.toRomaji(problemData.value);
                problem.choices = KanaManager.randomRomaji(4);
                problem.answerIndex = this.finalizeChoices(problem.choices, answer);
            } else { //romaji -> kana
                problem.question = KanaManager.toRomaji(problemData.value);
                let answer:string = problemData.value;
                problem.choices = KanaManager.randomKana(4);
                problem.answerIndex = this.finalizeChoices(problem.choices, answer);
            }
            callback(problem);
        } else if (problemData.type === "vocabulary") {
            this.fetchVocabularyById(parseInt(problemData.value), connection, (vocab:any) => {
                if (Math.random() < 0.5) { //reading -> meaning
                    problem.question = vocab.reading;
                    if (vocab.kanji != null && vocab.kanji.length > 0) problem.question = vocab.kanji + "\n" + problem.question;
                    this.fetchRandomWords("meaning", 4, connection, (choices:string[]) => {
                        problem.choices = choices;
                        problem.answerIndex = this.finalizeChoices(choices, vocab.meaning);
                        callback(problem);
                    });
                } else { //meaning -> reading
                    problem.question = vocab.meaning;
                    this.fetchRandomWords("reading", 4, connection, (choices:string[]) => {
                        problem.choices = choices;
                        problem.answerIndex = this.finalizeChoices(choices, vocab.reading);
                        callback(problem);
                    });
                }
            });
        } else {
            throw new Error("Unknown problem type: " + problemData.type);
        }
    }

    private fetchVocabularyById(id:number, connection:any, callback:(vocab:any) => void):void {
        let sql:string = 'SELECT kanji, reading, meaning FROM vocabulary WHERE id=?';
        connection.query(sql, [id], (err:any, res:any[], fields:any) => {
            if (err != null) throw new Error(err);
            if (res.length === 0) callback(null);
            callback(res[0]);
        });
    }

    private fetchRandomWords(fieldName:string, length:number, connection:any, callback:(words:string[]) => void):void {
        let sql:string = `SELECT ${fieldName} FROM vocabulary ORDER BY RAND() LIMIT ${length}`;
        connection.query(sql, (err:any, res:any[], fields:any) => {
            if (err != null) throw new Error(err);
            let words:string[] = [];
            for (let item of res) {
                words.push(item[fieldName]);
            }
            callback(words);
        });
    }

    private finalizeChoices(choices:string[], answer:string):number {
        if (choices.indexOf(answer) < 0) choices[0] = answer;
        Util.shuffle(choices);
        return (choices.indexOf(answer));
    }

    private calculateWorth(mastery:number, nextDue:number):number {
        let now:number = new Date().getTime()/1000;
        let gap:number = Math.pow(DatabaseManager.SRS_BASE, mastery);
        let lastDue:number = nextDue - gap;
        let worth:number = (now-lastDue)/gap;
        if (worth > 1) worth = 1;
        return worth;
    }


    private fetchProblemData(username:string, connection:any, callback:(ProblemData:any) => void):void {
        this.fetchRandomDueCard(username, connection, (problemData:ProblemData) => {
            if (problemData != null) {
                callback(problemData);
            } else {
                this.fetchNewCard(username, connection, (problemData:ProblemData) => {
                    if (problemData != null) {
                        callback(problemData);
                    } else {
                        this.fetchNextDueCard(username, connection, (problemData:ProblemData) => {
                            callback(problemData);
                        });
                    }
                });
            }
        });
    }

    private fetchCard(endingSql:string, data:any[], connection:any, callback:(problemData:any) => void):void {
        let sql:string = 'SELECT cards.value, cards.type, cards.id as cardId, masteries.value as mastery, masteries.nextDue FROM cards LEFT JOIN masteries ON cards.id=masteries.cardId ';
            sql += endingSql;
            connection.query(sql, data, (err:any, res:any[], fields:any) => {
                if (err) throw new Error(err);
                if (res.length === 0) {
                    callback(null);
                } else {
                    let result:any = res[0];
                    callback(new ProblemData(result.cardId, result.value, result.type, result.mastery, result.nextDue));
                }
            });
    }

    private fetchRandomDueCard(username:string, connection:any, callback:(problemData:any) => void):void {
        let now:number = new Date().getTime()/1000;
        this.fetchCard('WHERE username=? AND nextDue<=? ORDER BY RAND() LIMIT 1', [username, now], connection, callback);
    }

    private fetchNewCard(username:string, connection:any, callback:(problemData:any) => void):void {
        this.fetchCard('AND masteries.username=? ORDER BY id ASC LIMIT 1', [username], connection, (problemData:any) => {
            if (problemData == null) {
                callback(null);
            } else {
                problemData.value = 0;
                problemData.nextDue = 0;
                let sql:string = 'INSERT INTO masteries (username, cardId, value, nextDue) VALUES (?, ?, ?, ?)';
                connection.query(sql, [username, problemData.cardId, problemData.mastery, problemData.nextDue], function(err:any, res:any[], fields:any) {
                    if (err != null) throw new Error(err);
                    callback(problemData);
                });
            }
        });
    }

    private fetchNextDueCard(username:string, connection:any, callback:(problemData:any) => void):void {
        this.fetchCard('AND masteries.username=? ORDER BY nextDue ASC LIMIT 1', [username], connection, callback);
    }
}

class ProblemData {
    public constructor(public id:number, public value:string, public type:string, public mastery:number, public nextDue:number){}
}