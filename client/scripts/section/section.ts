import { App } from "../app";

declare var $;

export class Section {

    private $section:any;
    protected app:App;

    public constructor(name:string, app:App) {
        this.$section = $(`#${name}`);
        this.app = app;
    }

    public show():void {
        this.$section.show();
    }

    public hide():void {
        this.$section.hide();
        this.app.clearNotifications();
    }
}