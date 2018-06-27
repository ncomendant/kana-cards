import { Problem } from "../kana-cards-shared/problem";

export class User {
    public token:string;
    public name:string;
    public problem:Problem;
    public lastVoiceText:string;

    public constructor(token:string, name:string) {
        this.token = token;
        this.name = name;
        this.problem = null;
        this.lastVoiceText = null;
    }
}