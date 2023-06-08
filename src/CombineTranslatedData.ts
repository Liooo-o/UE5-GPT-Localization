import { OptionValues } from "commander";
import { FileUtil } from "./FileUtil";
import { GameDataUtil } from "./GameDataUtil";



export namespace CombineTranslatedData {
    export function main(opts: OptionValues) {
        const fPath = opts.path;
        const moduleConfig = FileUtil.getModuleConfig(fPath, opts.moduleConfig);

        
        const transTabMap = FileUtil.getTranslationTable(fPath, opts.dictName);
        const GPTTransTabMap = FileUtil.getTranslationTable(fPath, opts.gptName);
        const tempTabMap = FileUtil.getTranslationTable(fPath, opts.tempDict);

        const sourceData = FileUtil.readTabFile(fPath, opts.sourceName);

        const outputData = GameDataUtil.getOutputData(sourceData, moduleConfig, transTabMap, GPTTransTabMap, tempTabMap);

        FileUtil.saveMapToXlsx(fPath, opts.xlsxName , outputData.xlsxData);
        FileUtil.save2DStringArrToTab(outputData.gameTranslateData, fPath, opts.gameTranslate);
        console.log("合并完成!");
    }
}

