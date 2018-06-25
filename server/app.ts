import { DatabaseManager } from "./database-manager";

export class App {

    private db:DatabaseManager;

    public constructor() {
        this.db = new DatabaseManager();
    }

}

new App();