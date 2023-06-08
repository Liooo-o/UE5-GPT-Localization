import { OptionValues } from "commander";
import { FileUtil } from "./FileUtil";
import { GameDataUtil } from "./GameDataUtil";
import { TaskUtil } from "./TaskUtil";
import { DICT_TAB_INIT } from "./Define";



export namespace Translator {

    export async function main(opts: OptionValues){
        const filePath = opts.path;

        const unTranslatedData = FileUtil.readTabFile(filePath, opts.untranslatedName);
        const replaceData = FileUtil.readTabFile(filePath, opts.replaceName);
        const transConfig = FileUtil.getTransConfig(filePath, opts.transConfig);
        const requestData = GameDataUtil.filtrateTaskData(unTranslatedData);

        const taskData = TaskUtil.createTasksData(requestData);

        const outputData = await TaskUtil.startTask(taskData, replaceData, opts, transConfig.tipPrompt);

        FileUtil.saveTaskToTab(outputData, DICT_TAB_INIT, opts.path, opts.gptName);
    }
}