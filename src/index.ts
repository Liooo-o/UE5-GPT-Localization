import { Command, Option} from 'commander';
import path from 'path';
import { Translator } from './Translator';
import { CombineTranslatedData } from './CombineTranslatedData';
import { FilterGameData } from './FilterGameData';

const trans = new Command();


trans
    // 基础配置,路径、文件名
    .addOption(new Option('-p, --path <string>', 'file path: game.tab....').default(path.resolve(__dirname, '../test')))
    .addOption(new Option('-sn, --source-name <string>', 'source file name').default("Game.tab"))
    .addOption(new Option('-mn, --module-config <string>', 'module file name').default("module.ini"))
    .addOption(new Option('-tn, --trans-config <string>', 'module file name').default("TransConfig.ini"))
    .addOption(new Option('-dn, --dict-name <string>', 'dict file name').default("Translated.tab"))
    .addOption(new Option('-gn, --glossary-name <string>', 'glossary file name').default("Glossary.tab"))

    .addOption(new Option('-xn, --xlsx-name <string>', 'output xlsx file name').default("Game.xlsx"))
    .addOption(new Option('-gtn, --game-translate <string>', 'GameTranslate file name').default("GameTranslate.tab"))

    // TODO: 将策划的配置文件和程序的配置文件分开管理

    // 临时文件夹、文件名
    .addOption(new Option('-utn, --untranslated-name <string>', 'untranslated file name').default("TempFile/unTranslateData.tab"))
    .addOption(new Option('-rn, --replace-name <string>', 'replace file name').default("TempFile/replace.tab"))
    .addOption(new Option('-gfn, --gpt-name <string>', 'GPT translated file name').default("TempFile/GPTTranslated.tab"))
    .addOption(new Option('-tdn, --temp-dict <string>', 'temp dict file name').default("TempFile/tempDict.tab"))
    // GPT 相关配置
    .addOption(new Option('-cs, --chunk-size <number>', 'size of request msg').default(500))
    .addOption(new Option('-cc, --chunk-count <number>', 'count of a request msg').default(40))
    .addOption(new Option('-cd, --coll-down <number>', 'send request collDown').default(1000, "1s"))
    .addOption(new Option('-tl, --task-lifetime <number>', 'lifetime of Task(request)').default(90000,"90s"))
    .addOption(new Option('-k, --api-key <string>', 'openAi api key').env('OPENAI_API_KEY'))
    .parse();


trans
    .command("filter")
    .description("pretreatment data, get unTranslate data")
    .action(()=> {
        const opt = trans.opts();
        console.log("数据预处理流程开始");
        FilterGameData.main(opt);
    });


trans
    .command("runGPT")
    .description("run translate")
    .action(()=> {
        const opt = trans.opts();
        if(opt.apiKey === undefined) {
            console.error("please set api key, name: OPENAI_API_KEY !!!!!!!");
            return;
        }
        console.log("GPT翻译流程开始");
        Translator.main(opt);
    });

trans
    .command("combine")
    .description("combine translated data")
    .action(()=> {
        const opt = trans.opts();
        console.log("合并翻译数据流程开始");
        CombineTranslatedData.main(opt);
    });

trans
    .command("test")
    .description("combine translated data")
    .action(async ()=> {
        const opt = trans.opts();
        console.log("start Translate！");
        FilterGameData.main(opt);
        await Translator.main(opt);
        CombineTranslatedData.main(opt);
        console.log("OVER！！");
    });

trans.parse();

