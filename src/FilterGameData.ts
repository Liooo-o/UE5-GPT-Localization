import { OptionValues } from "commander";
import { FileUtil } from "./FileUtil";
import { GameDataUtil } from "./GameDataUtil";
import { TAB_UNTRANS_INIT, TAB_REPLACE_INIT, DICT_TAB_INIT } from "./Define";
import { log } from "console";



export namespace FilterGameData {
    export function main(opts: OptionValues) {
        const fPath = opts.path;
        const moduleConfig = FileUtil.getModuleConfig(fPath, opts.moduleConfig);
        const transConfig = FileUtil.getTransConfig(fPath, opts.transConfig);

        const transTabMap = FileUtil.getTranslationTable(fPath, opts.dictName);
        const sourceData = FileUtil.readTabFile(fPath, opts.sourceName);
        const glossaryMap = FileUtil.getTranslationTable(fPath, opts.glossaryName);

        let unTranslateData = GameDataUtil.filterGameDataByModule(sourceData, moduleConfig, transTabMap, transConfig.transAll);

        console.log(`过滤后的数据条数: ${unTranslateData.result.length}`);
        console.log(`开始替换术语库`);
        let GPTSource = GameDataUtil.replaceGlossary(unTranslateData.result, glossaryMap, moduleConfig);
        console.log(`替换完成`);

        FileUtil.saveMapToTab(fPath, opts.tempDict, unTranslateData.dict, DICT_TAB_INIT);

        FileUtil.save2DStringArrToTab(GPTSource.unTrans, fPath, opts.untranslatedName);
        FileUtil.save2DStringArrToTab(GPTSource.replace, fPath, opts.replaceName);
        console.log("预处理完成!");
    }
}