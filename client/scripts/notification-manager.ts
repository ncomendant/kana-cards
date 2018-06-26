declare var $;

export class NotificationManager {

    private $alerts:any;
    private queue:NotificationEvent[];
    private timeoutId:number;

    public constructor() {
        this.$alerts = $("#alerts");
        this.queue = [];
    }

    public notify(type:string, message:string):void {
        this.queue.push(new NotificationEvent(type, message));
        if (this.timeoutId == null) this.showNext();
    }

    public clear():void {
        if (this.timeoutId != null) {
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
        }
        this.queue.length = 0;
        this.$alerts.empty();
    }

    private showNext():void {
        if (this.queue.length === 0) return;
        let event:NotificationEvent = this.queue.shift();
        let $alert:any = $(`<div class='alert alert-${event.type}' role='alert'>${event.message}</div>`);
        $alert.hide();
        this.$alerts.append($alert);
        $alert.fadeIn(200);
        this.timeoutId = setTimeout(() => {
            $alert.fadeOut(200, () => {
                $alert.remove();
                this.timeoutId = null;
                this.showNext();
            });
        }, 3000);
    }
}

class NotificationEvent {
    public constructor(public type:string, public message:string){}
}