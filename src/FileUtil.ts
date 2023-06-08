import fs from "fs";
import path from "path";
import ini from 'ini';
import * as XLSX from 'xlsx';
import { IModuleConfig, ITask, ITransConfig } from "./Define";


export namespace FileUtil {

    /**
     * @description 读取 .tab 文件为 string[][]
     * @param filePath 文件夹路径
     * @param fileName 文件名
     * @returns string[][]
     */
    export function readTabFile(filePath: string, fileName: string): string[][] {
        const tabPath = path.join(filePath, fileName);

        if (!fs.existsSync(tabPath)) {
            console.error(`文件路径不存在!: ${tabPath}`);
            process.exit(1);
        }

        const data = fs.readFileSync(tabPath, "utf-8");

        const lines = data.split("\n");
        const result: string[][] = [];

        lines.forEach((line, index) => {
            
            if (index === 0) {
                return;
            }
            if(line.split("\t")[0] === "") {
                return;
            }

            result.push(line.split("\t"));
        });
        return result;
    }


    /**
     * @description 将 string[][] 保存为 .tab 文件
     * @param arrData string[][]
     * @param filePath 文件夹路径
     * @param fileName 文件名
     */
    export function save2DStringArrToTab(arrData: string[][], filePath: string, fileName: string) {
        const tabPath = path.join(filePath, fileName);

        const txtContent: string[] = [];

        arrData.forEach((ele) => {
            let line = ele.join("\t");
            txtContent.push(line);
        });

        fs.writeFileSync(tabPath, txtContent.join("\n"));
    }

    /**
     * @description 将任务数据保存到 tab 文件
     * @param tasks 所有任务数据
     * @param tabHeader tab 文件的 header
     * @param filePath tab 文件路径
     * @param fileName tab 文件名
     */
    export function saveTaskToTab(tasks: Map<string, ITask[]>, tabHeader: string[], filePath: string, fileName: string) {
        let outPutData = formatTaskToTabData(tasks, tabHeader);
        save2DStringArrToTab(outPutData, filePath, fileName);
    }

    
    /**
     * @description 将 .tab 文件解析为 Map
     * @param filePath 文件夹路径
     * @param fileName 文件名
     * @returns Map<string, Map<string, string>> 第一层 key 为模块名，第二层 key 为原文，value 为译文
     */
    export function getTranslationTable(filePath: string, fileName: string) {
        const TabData = readTabFile(filePath, fileName);

        const TransTabMap = new Map<string, Map<string, string>>();

        TabData.forEach(([module, sText, tText]) => {
            let transMap = TransTabMap.get(module) || new Map<string, string>();
            transMap.set(sText, tText);
            TransTabMap.set(module, transMap);
        });

        return TransTabMap;
    }

    /**
     * @description 解析 ini 文件为，ITransConfig
     * @param filePath 文件夹路径
     * @param fileName 文件名
     * @returns ITransConfig
     */
    export function getTransConfig(filePath: string, fileName: string) {
        const parsedConfig = readIniFile(filePath, fileName);

        const result: ITransConfig = {
            transAll : parsedConfig.translateAll,
            tipPrompt : parsedConfig.tipPrompt + parsedConfig.targetLanguage + parsedConfig.tipPrompt1,
        }
        return result;
    }

    /**
     * @description 解析 ini 文件为，IModuleConfig
     * @param filePath 文件夹路径
     * @param fileName 文件名
     * @returns IModuleConfig
     */
    export function getModuleConfig(filePath: string, fileName: string) {
        const parsedConfig = readIniFile(filePath, fileName);

        const map = new Map<string, string>();
        if (parsedConfig.map) {
            for (const key of Object.keys(parsedConfig.map)) {
                const value = parsedConfig.map[key];
                map.set(key, value);
            }
        }

        let weight: string[] = [];
        if (parsedConfig.array) {
            for (const key of Object.keys(parsedConfig.array)) {
                weight = parsedConfig.array[key].split(',');
            }
        }

        const config: IModuleConfig = {
            needGPT: parsedConfig.needGPT,
            map: map,
            array: weight
          };

        return config;
    }

    /**
     * @description 保存一份 Xlsx 文件，格式为 key、sourceText、TranslateText、DIctionaryText
     * @param filePath 文件夹路径
     * @param fileName 文件名
     * @param data Map<string, string[][]> 第一层 key 为模块（sheet）名，第二层为 4 列 xlsx 数据
     */
    export function saveMapToXlsx(
        filePath: string, 
        fileName: string, 
        data: Map<string, string[][]>,
        ) {
        const xlsxPath = path.join(filePath, fileName);

        const workbook = XLSX.utils.book_new();

        data.forEach((value, key) => {
            const worksheet = XLSX.utils.aoa_to_sheet(value);
            XLSX.utils.book_append_sheet(workbook, worksheet, key);
        })

        XLSX.writeFile(workbook, xlsxPath);
    }

    /**
     * @description 将 map 数据转换为 tab 文件格式
     * @param filePath 文件夹路径
     * @param fileName 文件名
     * @param data Map<string, Map<string, string>>，第一层 key 为模块名，第二层 k，v 为对照翻译
     * @param tabHeader tab 文件的 header
     */
    export function saveMapToTab(
        filePath: string, 
        fileName: string, 
        data: Map<string, Map<string, string>>, 
        tabHeader: string[],
        ) {
        let outPutData = formatMapToTabData(data, tabHeader);
        save2DStringArrToTab(outPutData, filePath, fileName);
    }

    /**
     * @description 将 map 数据转换为 tab 文件格式
     * @param mapData Map<string, Map<string, string>>，第一层 key 为模块名，第二层 k，v 为对照翻译
     * @param tabHeader tab 文件的 header
     * @returns string[][]
     */
    function formatMapToTabData(
        mapData: Map<string, Map<string, string>>, 
        tabHeader: string[],
        ) {
        let outPutData: string[][] = [];
        outPutData.push(tabHeader);

        mapData.forEach((value, name) => {
            value.forEach((tText, sText)=> {
                outPutData.push([name, sText, tText]);
            })
        });
        return outPutData;
    }

    /**
     * @description 读取 ini 文件
     * @param filePath 文件夹路径
     * @param fileName 文件名
     */
    function readIniFile(filePath: string, fileName: string) {
        const configPath = path.join(filePath, fileName);

        if (!fs.existsSync(configPath)) {
            console.error(`文件路径不存在!: ${configPath}`);
            process.exit(1);
        }

        const data = fs.readFileSync(configPath, "utf-8");
        return ini.parse(data);
    }

    /**
     * @description 将任务数据转换为 tab 文件格式
     * @param tasks 所有任务数据
     * @param tabHeader tab 文件的 header
     * @returns string[][]
     */
    function formatTaskToTabData(tasks: Map<string, ITask[]>, tabHeader: string[]) {
        const lines: string[][] = [];
        lines.push(tabHeader);
        tasks.forEach((tasks, moduleName) => {
            tasks.forEach((task) => {
                let tText = task.tText;
                if(tText === undefined) {
                    return;
                }
                task.sText.forEach((_, index) => {
                    const text = tText![index].replace(/\n/g, "\\n").replace(/\r/g, "\\r");
                    const row = task.row[index].replace(/\n/g, "\\n").replace(/\r/g, "\\r");
                    lines.push([moduleName, row, text]);
                });
            });
        });
        return lines;
    }
}