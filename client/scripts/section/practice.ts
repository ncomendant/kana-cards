import { Section } from "./section";
import { App } from "../app";
import { Problem } from "../../../study-amigo-shared/problem";
import { Path } from "../../../study-amigo-shared/path";
import { NotificationType } from "../notification-type";

declare var $;

export class Practice extends Section {

    

    private $problem:any;
    private $cardMastery:any;
    private $problemWorth:any;

    private $problemQuestion:any;
    private $problemChoices:any;

    private $choiceList:any[];

    private awaitingUser:boolean;

    private problemActive:boolean;
    private promptIntervalId:number;

    //audio
    private $voiceCheck:any;
    private voiceEnabled:boolean;
    private audioCtx:any;
    private voiceAudio:any;

    public constructor(app:App) {
        super("practice", app);

        this.$voiceCheck = $("#voiceCheck");

        this.$problem = $("#problem");
        this.$cardMastery = $("#cardMastery");
        this.$problemWorth = $("#problemWorth");
        this.$problemQuestion = $("#problemQuestion");
        this.$problemChoices = $("#problemChoices");

        this.$choiceList = [];

        this.awaitingUser = false;
        this.problemActive = false;

        this.audioCtx = new (window['AudioContext'] || window['webkitAudioContext'])(); 
        this.voiceAudio = null;

        this.voiceEnabled = true;

        this.$problem.fadeTo(0, 0);

        $(document).on("click", () => {
            if (!this.visible || !this.awaitingUser) return;
            this.awaitingUser = false;
            clearInterval(this.promptIntervalId);
            this.app.clearNotifications();
            this.requestProblem();
        });

        this.$voiceCheck.on("change", () => {
            this.voiceEnabled = !this.voiceEnabled;
        });
    }

    private requestProblem():void {
        this.voiceAudio = null;
        this.$problem.fadeTo(100, 0, () => {
            this.app.get(Path.PROBLEM, null, (data:any) => {
                this.displayProblem(data.problem);
            }, false);
        });
    }

    private displayProblem(problem:Problem):void {
        let mastery:number = Math.round(problem.mastery*100)/100;
        let worth:number = Math.round(problem.worth*100)/100;
        this.$cardMastery.html(`Word Mastery: ${mastery}`);
        this.$problemWorth.html(`Problem Value: ${worth}`);

        this.$problemQuestion.html(problem.question);

        //populate choices
        this.$problemChoices.empty();
        this.$choiceList = [];
        for (let i:number = 0; i < problem.choices.length; i++) {
            let $choice:any = $(`<div class='choice'>${problem.choices[i]}</div>`);
            this.$choiceList.push($choice);
            this.$problemChoices.append($choice);
            //add click event handler
            (($choice:any, index:number) => {
                $choice.on("click", (event:any) => {
                    if (!this.problemActive) return;
                    this.problemActive = false;
                    event.stopPropagation();
                    this.app.clearNotifications();
                    $choice.addClass('selected');
                    this.app.get(Path.RESPONSE, {index:index}, (feedback:any) => {
                        this.displayFeedback(feedback);
                    }, false);
                });
            })($choice, i);
        }
        this.problemActive = true;

        if (this.voiceEnabled) {
            this.fetchVoice(() => {
                this.playVoice();
                this.$problem.fadeTo(100, 1);
            });
        } else {
            this.$problem.fadeTo(100, 1);
        }
    }

    private displayFeedback(feedback:any):void {
        let correct:boolean = feedback.correct;
        let answerIndex:number = feedback.answerIndex;
        let nextGap:number = feedback.nextGap;

        if (this.voiceEnabled) {
            this.fetchVoice(() => {
                this.playVoice();
                this.completeFeedback(correct, answerIndex, nextGap);
            });
        } else {
            this.completeFeedback(correct, answerIndex, nextGap);
        }
    }

    private playVoice():void {
        if (this.voiceAudio != null) this.voiceAudio.start(0);
    }

    private completeFeedback(correct:boolean, answerIndex:number, nextGap:number):void {
        this.$choiceList[answerIndex].addClass('answer');
        let gapText:string = this.prettifyTime(nextGap);
        if (correct) {
            this.app.notify(NotificationType.SUCCESS, `Great job! You'll see this card again in ${gapText}.`);
            setTimeout(() => {
                this.requestProblem();
            }, 2000);
        } else {
            this.awaitingUser = true;
            this.app.notify(NotificationType.DANGER, `Not quite. You'll see this card again in ${gapText}.`);
            this.promptIntervalId = setInterval(() => {
                this.app.notify(NotificationType.INFO, 'Click anywhere to continue.');
            }, 5000);
        }
    }

    private fetchVoice(callback:() => void = null):void {
        this.app.binaryGet(Path.VOICE, (buffer:any) => {
            if (buffer == null) {
                this.voiceAudio = null;
                return;
            }
            this.voiceAudio = this.audioCtx.createBufferSource();
            this.audioCtx.decodeAudioData(buffer, (audioBuffer:any) => {
                this.voiceAudio.buffer = audioBuffer;
                this.voiceAudio.connect(this.audioCtx.destination);
                callback();
            });
        });
    }

    private prettifyTime(seconds:number):string {
        if (seconds < 60) return "a moment"; //if less than a minute
        else if (seconds < 3600) return `${Math.ceil(seconds/60)} minutes`; //if less than an hour, return in minutes
        else if (seconds < 86400) return `${Math.ceil(seconds/3600)} hours`  //if less than a day, return in hours
        else return `${Math.ceil(seconds/86400)} days` //otherwise return in days
    }

    public show():void {
        super.show();
        this.requestProblem();
    }
    
}