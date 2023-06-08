export const API_KEY = process.env.OPENAI_API_KEY;

export const CHECK_ONLY_CN = /^[A-Za-z0-9!@#$%^&*()_+-《》“”：；（）！=,，.。、！<>?;:'"[\]{}|`\s]*$/;

export const CHECK_LOOP_TEXT = /(..)\1{4}/;

export const REGEX_ARR = [CHECK_ONLY_CN, CHECK_LOOP_TEXT];

export const DICT_TAB_INIT = ["Module", "SourceText", "TranslatedText"];

export const GAME_TRANSLATE_INIT = ["Key", "SourceText", "TranslateText"];




export const TAB_UNTRANS_INIT = ["Module", "ReplaceText", "TranslatedText"];

export const TAB_REPLACE_INIT = ["Module", "SourceText", "ReplaceText"];





export const XLSX_INIT_TEST = ["Key", "SourceText", "TranslateText", "DictionaryText"];

export const DEFAULT_MODULE = "common";

export enum TaskState {
    finished = "finished",
    error = "error",
}

export interface ITask{
    state?: TaskState,
    row: string[],
    sText: string[],
    tText?: string[],
    errorMsg?: string,
    erqRes?: any,
}

export interface IModuleConfig{
    needGPT: boolean,
    map: Map<string, string>,
    array: string[],
}

export interface ITransConfig{
    transAll: boolean,
    tipPrompt: string,
}

