import { DEFAULT_MODULE, GAME_TRANSLATE_INIT, IModuleConfig, REGEX_ARR, TAB_REPLACE_INIT, TAB_UNTRANS_INIT, XLSX_INIT_TEST } from "./Define";

export namespace GameDataUtil {
    /**
     * @description 去重，去除特殊字符，按长度排序的数据
     * @param Data 需要翻译的数据
     */
    export function filtrateTaskData(Data: string[][]) {

        let result = getUniqueStr(Data);
        result = regexTest(result, REGEX_ARR);
        result = sortStringArrBySize(result);
        return result;
    }

    /**
     * @description 将待翻译数据去重
     */
    function getUniqueStr(originalData: string[][]) {

        let tempArr: string[][] = [];

        originalData.forEach((line) => {
            const [module,replaceText, translateText] = line;

            let tempLine = tempArr.find((ele) => {
                const [name, replaceText1, _] = ele;
                return module === name && replaceText === replaceText1;
            });

            if(tempLine === undefined) {
                tempArr.push([module, replaceText, translateText]);
            }
        });

        return tempArr;
    }

    /**
     * @description 根据正则表达式过滤待翻译数据
     */
    function regexTest(data: string[][], regexArr: RegExp[]) {
        const result = data.filter((str) => {
            const [_, replaceText, __] = str;
            return regexArr.every((regex) => !regex.test(replaceText));
        });
        return result;
    }

    /**
     * @description 将待翻译数据按长度排序，从小到大
     */
    function sortStringArrBySize(str: string[][]) {
        return str.sort((a: string[], b: string[]) => {
            const [_, replaceText1, __] = a;
            const [___, replaceText2, ____] = b;
            return replaceText1.length - replaceText2.length;
        });
    }

    /**
     * @description 根据配置的数据块最大字符数和最大数据条数，将数据分块
     * @param strArr 待翻译数据
     * @param chunkSize 数据块最大字符长度
     * @param chunkCount 数据块最大数据条数
     * @returns string[][]
     */
    export function blockData(strArr: string[], chunkSize: number, chunkCount: number): string[][] {
        const result: string[][] = [];
  
        let currentChunk: string[] = [];
        let currentLength = 0;

        for (const str of strArr) {
            const strLength = str.length;

            if (currentLength + strLength > chunkSize || currentChunk.length === chunkCount) {
                result.push(currentChunk);
                currentChunk = [];
                currentLength = 0;
            }

            currentChunk.push(str);
            currentLength += strLength;
        }

        if (currentChunk.length > 0) {
            result.push(currentChunk);
        }

        return result;
    }

    /**
     * @description 将原始数据对照，人工翻译表、GPT翻译表、临时翻译表，根据模块配置生成最终的翻译数据
     * @param originalData 原始数据
     * @param moduleConfig 模块配置
     * @param transMap 人工翻译表
     * @param GPTMap GPT翻译表
     * @param tempMap 临时翻译表
     * @returns xlsx 格式的数据和 tab 格式的数据
     */
    export function getOutputData(
        originalData: string[][], 
        moduleConfig: IModuleConfig, 
        transMap: Map<string, Map<string, string>>,
        GPTMap: Map<string, Map<string, string>>,
        tempMap: Map<string, Map<string, string>>,
        ) {
        const xlsxData = new Map<string, string[][]>();
        const gameTranslateData: string[][] = [];
        gameTranslateData.push(GAME_TRANSLATE_INIT)
        
        for(const Data of originalData) {
            let [key, sText, tText] = Data;
            const moduleName = getModuleName(key, moduleConfig.map);

            let dataArr = xlsxData.get(moduleName) || [XLSX_INIT_TEST];

            let tempTrans = findTranslatedTextFromModuleMap(moduleName, sText, transMap, moduleConfig.array);
            let GPTTempTrans = findTranslatedTextFromModuleMap(moduleName, sText, GPTMap, moduleConfig.array);
            let tempTempTrans = findTranslatedTextFromModuleMap(moduleName, sText, tempMap, moduleConfig.array);

            tText = tempTrans || sText;

            if(moduleConfig.needGPT) {
                tText = tempTrans || GPTTempTrans || tempTempTrans || sText;
            }

            const dText = tempTrans || "";

            dataArr.push([key, sText, tText, dText]);

            gameTranslateData.push([key, sText, tText]);
            xlsxData.set(moduleName, dataArr);
        }

        return {xlsxData, gameTranslateData};
    }

    // TODO: 优化
    export function findTranslatedTextFromModuleMap(
        moduleName: string, 
        sText: string, 
        transMap: Map<string, Map<string, string>>,
        weightArr: string[],
        ) {
        if(!weightArr.includes(moduleName)){
            const moduleTransMap = transMap.get(DEFAULT_MODULE);
            return moduleTransMap?.get(sText) || undefined;
        }
        let index = weightArr.indexOf(moduleName);
        for(index; index < weightArr.length; index++) {
            const module = weightArr[index];
            const moduleTransMap = transMap.get(module);
            if(moduleTransMap?.has(sText)) {
                return moduleTransMap.get(sText);
            }
        }
        return undefined;
    }

    // TODO: 优化
    export function filterGameDataByModule(
        sourceData: string[][],
        moduleConfig: IModuleConfig,
        transMap: Map<string, Map<string, string>>,
        isTransAll: boolean,
        ) {
        const result: string[][] = [];
        const dict = new Map<string, Map<string, string>>();
        sourceData.forEach((line) => {
            const [key, sText, tText] = line;
            const moduleName = getModuleName(key, moduleConfig.map);
            let tempTrans = findTranslatedTextFromModuleMap(moduleName, sText, transMap, moduleConfig.array);
            if(tempTrans !== undefined) {
                return;
            }
            if(tText !== "" && tText !== sText) {
                let map = dict.get(moduleName) || new Map<string, string>();
                map.set(sText, tText);
                dict.set(moduleName, map);
                if(!isTransAll) {
                    return;
                }
            }
            result.push(line);
        });    
        return {result, dict};
    }

    // TODO: 优化
    export function replaceGlossary(
        sourceData: string[][], 
        glossaryMap: Map<string, Map<string, string>>,
        moduleConfig: IModuleConfig,
        ) {

        let unTrans: string[][] = [];
        unTrans.push(TAB_UNTRANS_INIT);

        let replace: string[][] = [];
        replace.push(TAB_REPLACE_INIT);

        sourceData.forEach((line) => {
            const [key, sText, tText] = line;
            
            const moduleName = getModuleName(key, moduleConfig.map);

            const mapArr = getModuleMapsByWeight(moduleName, glossaryMap, moduleConfig.array);

            let replaceText = sText;

            for(let i = 0;i < mapArr.length; i++) {
                const map = mapArr[i];
                map.forEach((value, key) => {
                    const tempRegex = new RegExp(key, "g");
                    replaceText = replaceText.replace(tempRegex, value);
                });                
            }

            unTrans.push([moduleName, replaceText, tText]);
            replace.push([moduleName, sText, replaceText]);
        });

        return {unTrans, replace};
    }

    /**
     * @description 根据虚幻导出的源文本 key，以及模块配置，获取模块名
     * @returns string
     */
    function getModuleName(key: string, moduleMap: Map<string, string>): string {
        const strArr = key.split("/");
        const endStr = strArr.pop();
        const moduleArr = endStr?.split(".");
        const fileName = moduleArr?.shift();
        const module =  fileName?.split("_").shift() || "";

        for(const [key, value] of moduleMap) {
            if(value.includes(module)) {
                return key;
            }
        }
        return DEFAULT_MODULE;
    }

    // TODO: 优化
    function getModuleMapsByWeight(
        moduleName: string, 
        transMap: Map<string, Map<string, string>>,
        weightArr: string[],
    ) {
        const result = [];
        if(!weightArr.includes(moduleName)){
            const moduleTransMap = transMap.get(moduleName);
            if(moduleTransMap !== undefined) {
                result.push(moduleTransMap);
            }
            return result;
        }
        let index = weightArr.indexOf(moduleName);
        for(index; index < weightArr.length; index++) {
            const module = weightArr[index];
            const moduleTransMap = transMap.get(module);
            if(moduleTransMap !== undefined) {
                result.push(moduleTransMap);
            }
        }
        return result;
    }
}