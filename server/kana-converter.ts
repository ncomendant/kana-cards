declare function require(moduleName:string):any;

let fs = require('fs');

export class KanaConverter {
    private static hiraganaCharacters:string[];
    private static hiraganaReadings:string[];

    public static load():void {
        KanaConverter.hiraganaCharacters = []
        KanaConverter.hiraganaReadings = [];
        let text:string = fs.readFileSync('./hiragana.txt', 'utf8');
        let rows:string[] = text.split("\r\n");
        for (let row of rows) {
            let fields:string[] = row.split("\t");
            if (fields.length !== 2) continue;
            KanaConverter.hiraganaCharacters.push(fields[1].trim());
            KanaConverter.hiraganaReadings.push(fields[0].trim());
        } 
    }
    
    public static toRomaji(kana:string):string {
        let romaji:string = "";
        for (let i = 0; i < kana.length; i++) {

            let smallTsu:boolean = kana[i] === "っ";
            if (smallTsu) i++;

            let index:number = this.getNextKanaIndex(kana, i);
            if (index >= 0) {
                if (smallTsu) {
                    romaji += KanaConverter.hiraganaReadings[index][0];
                }
                romaji += KanaConverter.hiraganaReadings[index];
                i += KanaConverter.hiraganaCharacters[index].length-1; //-1 due to for loop's incrementing
            } else {
                romaji += kana[i]; //invalid kana, so just append it as is
            }
        }
        return romaji;
    }

    public static toKana(romaji:string):string {
        romaji = romaji.toLowerCase();
        let kana:string = "";
        for (let i = 0; i < romaji.length; i++) {
            let index:number = KanaConverter.getNextSyllableIndex(romaji, i);
            if (index >= 0) {
                kana += KanaConverter.hiraganaCharacters[index];
                i += KanaConverter.hiraganaReadings[index].length - 1; //-1 due to for loop's incrementing
            } else {
                //if romaji character is the same as the first character of the next syllable, append a small tsu
                let nextIndex:number = KanaConverter.getNextSyllableIndex(romaji, i+1);
                if (nextIndex >= 0 && romaji[i] === KanaConverter.hiraganaReadings[nextIndex][0]) {
                    kana += "っ";
                } else {
                    kana += romaji[i]; //invalid romaji, so just append it as is
                }
            }
        }
        return kana;
    }

    private static getNextKanaIndex(kana:string, i:number):number {
        for (let kanaLength:number = 2; kanaLength > 0; kanaLength--) {
            let char:string = kana.slice(i, i+kanaLength);
            let index:number = KanaConverter.hiraganaCharacters.indexOf(char);
            if (index >= 0) return index;
        }
        return -1;
    }

    private static getNextSyllableIndex(romaji:string, i:number):number {
        for(let syllableLength = 3; syllableLength > 0; syllableLength--) {
            let syllable:string = romaji.slice(i, i+syllableLength);
            let index:number = KanaConverter.hiraganaReadings.indexOf(syllable);
            if (index >= 0) {
                return index;
            } 
        }
        return -1;
    }
}