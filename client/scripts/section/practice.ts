import { Section } from "./section";
import { App } from "../app";
import { Problem } from "../../../kana-cards-shared/problem";
import { Path } from "../../../kana-cards-shared/path";
import { NotificationType } from "../notification-type";

declare var $;

export class Practice extends Section {
    private $problem:any;
    private $cardId:any;
    private $cardMastery:any;
    private $problemWorth:any;


    private $problemQuestion:any;
    private $problemChoices:any;

    private $choiceList:any[];

    private problemActive:boolean;
    private promptIntervalId:number;

    public constructor(app:App) {
        super("practice", app);
        this.$problem = $("#problem");
        this.$cardId = $("#cardId");
        this.$cardMastery = $("#cardMastery");
        this.$problemWorth = $("#problemWorth");
        this.$problemQuestion = $("#problemQuestion");
        this.$problemChoices = $("#problemChoices");

        this.$choiceList = [];
        this.problemActive = false;

        this.$problem.fadeTo(0, 0);   

        $(document).on("click", () => {
            if (this.problemActive) return;
            clearInterval(this.promptIntervalId);
            this.app.clearNotifications();
            this.requestProblem();
        });
    }

    private requestProblem():void {
        this.$problem.fadeTo(100, 0, () => {
            this.app.get(Path.PROBLEM, null, (data:any) => {
                this.displayProblem(data.problem);
            }, false);
        });
    }

    private displayProblem(problem:Problem):void {
        let mastery:number = Math.round(problem.mastery*100)/100;
        let worth:number = Math.round(problem.worth*100)/100;
        this.$cardId.html(`ID: ${problem.id}`);
        this.$cardMastery.html(`Mastery: ${mastery}`);
        this.$problemWorth.html(`Value: ${worth}`);

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
        this.$problem.fadeTo(100, 1);
    }

    private displayFeedback(feedback:any):void {
        let correct:boolean = feedback.correct;
        let answerIndex:number = feedback.answerIndex;
        let nextGap:number = feedback.nextGap;
        
        let gapText:string = this.prettifyTime(nextGap);

        this.$choiceList[answerIndex].addClass('answer');

        if (correct) {
            this.app.notify(NotificationType.SUCCESS, `Great job! You'll see this card again in ${gapText}.`);
            setTimeout(() => {
                this.requestProblem();
            }, 1000);
        } else {
            this.app.notify(NotificationType.DANGER, `Not quite. You'll see this card again in ${gapText}.`);
            this.promptIntervalId = setInterval(() => {
                this.app.notify(NotificationType.INFO, 'Click anywhere to continue.');
            }, 10000);
        }
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