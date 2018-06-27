import { Problem } from "../study-amigo-shared/problem";

export class User {
    public token:string;
    public name:string;
    public problem:Problem;
    public pendingVoice:any;
    public pendingVoiceText:string;


    public constructor(token:string, name:string) {
        this.token = token;
        this.name = name;
        this.problem = null;
    }
}