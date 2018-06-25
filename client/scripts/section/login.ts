import { Section } from "./section";
import { App } from "../app";
import { Path } from "../../../kana-cards-shared/path";
import { NotificationType } from "../notification-type";
import { FormValidator } from "../../../kana-cards-shared/form-validator";

declare var $;

export class Login extends Section {
    private $form:any;
    private $usernameInp:any;
    private $passwordInp:any;
    private $joinLink:any;

    public constructor(app:App) {
        super("login", app);

        this.$form = $("#loginForm");
        this.$usernameInp = $("#loginUsernameInp");
        this.$passwordInp = $("#loginPasswordInp");
        this.$joinLink = $("#loginCreateLink");
        
        //TODO - Better data validation
        this.$form.on("submit", (event:any) => {
            event.preventDefault();

            let username:string = this.$usernameInp.val().trim();
            let password:string = this.$passwordInp.val().trim();

            let validUsername:boolean = FormValidator.validateUsername(username, (err:string) => {
                this.app.notify(NotificationType.DANGER, err);
            });
            
            let validPassword:boolean = FormValidator.validatePassword(password, (err:string) => {
                this.app.notify(NotificationType.DANGER, err);
            });

            if (!validUsername || !validPassword) return;

            app.post(Path.LOGIN, {username:username, password:password}, (data:any) => {
                if (data.err != null) {
                    this.app.notify(NotificationType.DANGER, data.err);
                    this.$usernameInp.focus();
                } else {
                    this.app.token = data['token'];
                    console.log(this.app.token);
                    this.$form[0].reset();
                    this.hide();
                    this.app.practice.show();
                }
            });
        });

        this.$joinLink.on("click", (event:any) => {
            event.preventDefault();
            this.$form[0].reset();
            this.hide();
            this.app.join.show();
        });
    }

    public show():void {
        super.show();
        this.$usernameInp.focus();
    }
    
}