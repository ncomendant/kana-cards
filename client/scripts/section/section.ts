import { App } from "../app";

declare var $;

export class Section {

    private $section:any;
    protected app:App;
    private _visible:boolean;

    public constructor(name:string, app:App) {
        this.$section = $(`#${name}`);
        this.app = app;
        this._visible = true;
    }

    public show():void {
        this._visible = true;
        this.$section.show();
    }

    public hide():void {
        this._visible = false;
        this.$section.hide();
        this.app.clearNotifications();
    }

    protected get visible():boolean {
        return this._visible;
    }
}