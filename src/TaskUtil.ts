import { OptionValues } from "commander";
import { ITask, TaskState } from "./Define";
import { Configuration, OpenAIApi } from "openai"
import { GameDataUtil } from "./GameDataUtil";

const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

export namespace TaskUtil {

    /**
     * @description 开始翻译任务
     * @param taskData key--模块名，value--模块待翻译数据
     * @param replaceData 专属名词替换后的对照表
     * @param opts 配置项，任务分块大小，任务分块数量，任务间隔时间，任务超时时间等
     * @param tipPrompt 调用 API 时的提示语
     */
    export async function startTask(
        taskData: Map<string, string[][]>,
        replaceData: string[][],
        opts: OptionValues,
        tipPrompt: string,
    ) {
        const result = new Map<string, ITask[]>();
        for (const [moduleName, data] of taskData) {
            console.log("开始翻译模块数据：", moduleName, "\n");
            const requestData = data.map(([name, r, t]) => r);
            const blocks = GameDataUtil.blockData(requestData, opts.chunkSize, opts.chunkCount);
            const tasks = await TaskUtil.sendRequests(blocks, opts.collDown, opts.lifeTime, tipPrompt);
            TaskUtil.outputTaskMsg(tasks);
            const finishTasks = TaskUtil.getTasksByState(tasks, TaskState.finished);

            finishTasks.forEach((task) => {
                const rTexts = task.sText;
                rTexts.forEach((rText) => {
                    const row = replaceData.find(([name, s, r]) => r === rText);

                    if (row === undefined) {
                        task.row.push(rText);
                        return;
                    }
                    const [m, s, r] = row;
                    task.row.push(s);
                });
            });

            console.log(`\n模块数据翻译完成：${moduleName}\n`);
            await new Promise((resolve) => setTimeout(resolve, 2000));
            result.set(moduleName, finishTasks);
        }
        return result;
    }

    /**
     * @description 根据任务状态获取任务
     * @param task 所有任务
     * @param state 目标状态
     */
    export function getTasksByState(task: ITask[], state: TaskState): ITask[] {
        return task.filter((item) => item.state === state);
    }


    /**
     * @description 将处理好的数据按模块名分组
     * @param data 去重、排序、过滤后的数据
     */
    export function createTasksData(data: string[][]) {
        const result = new Map<string, string[][]>();

        data.forEach(([moduleName, r, t]) => {
            if (result.has(moduleName)) {
                return;
            }
            const moduleData = data.filter(([moduleName1, r1, t1]) => {
                return moduleName1 === moduleName;
            });
            result.set(moduleName, moduleData);
        });

        return result;
    }

    /**
     * @description 开始翻译请求
     * @param requests 待翻译数据
     * @param collDown 请求间隔时间
     * @param lifeTime 请求超时时间
     * @param tipPrompt 请求提示语
     * @returns Promise<ITask[]>
     */
    export async function sendRequests(requests: string[][], collDown: number, lifeTime: number, tipPrompt: string): Promise<ITask[]> {
        const promises = [];

        console.log(`开始请求，请求总数：${requests.length}\n`);
        for (const request of requests) {
            const oncePromise = createRequest(request, lifeTime, tipPrompt);
            promises.push(oncePromise);
            await new Promise((resolve) => setTimeout(resolve, collDown));
        }
        const promiseArr = await Promise.all(promises);
        console.log(`请求完成\n`);
        return promiseArr;
    }

    /**
     * @description 输出本次任务的翻译结果，失败的任务打印失败原因
     * @param tasks 所有任务
     */
    export function outputTaskMsg(tasks: ITask[]) {
        const finishedTasks = getTasksByState(tasks, TaskState.finished);
        const err = getTasksByState(tasks, TaskState.error);
        errorTasks(err);

        console.log(`\n翻译完成：${finishedTasks.length}\n翻译失败：${err.length}\n`);
    }

    /**
     * @description 输出失败任务的信息
     * @param tasks 失败任务
     */
    function errorTasks(tasks: ITask[]) {
        tasks.forEach(ele => {
            if (ele.state !== TaskState.error) {
                return;
            }
            console.warn(`翻译失败：\n源文本：${ele.sText}\n 返回信息：${ele.erqRes} \n失败原因：${ele.errorMsg}\n`);
        });
    }

    /**
     * @description 创建一条请求
     * @param content 本次请求的数据
     * @param lifeTime 请求的超时时间
     * @param tipPrompt 请求的提示语
     * @returns Promise<ITask>
     */
    function createRequest(content: string[], lifeTime: number, tipPrompt: string): Promise<ITask> {
        console.log(`数据请求：\n${JSON.stringify(content)}\n`);

        // TODO: 这一部分抽取出来做个工厂，适配所有模型
        const promise = openai.createChatCompletion({
            model: "gpt-3.5-turbo",
            messages: [{ role: "user", content: JSON.stringify(content) }, { role: "system", content: tipPrompt }],
            temperature: 0.1,
        }, { timeout: lifeTime });

        const taskPromise = promise.then((response) => {
            // console.log(response.data.choices[0]);
            const reqStr = response.data.choices[0].message?.content;
            
            const task: ITask = { sText: content, row: [], erqRes: JSON.stringify(response.data) };

            if (reqStr === undefined) {
                requestErr(task, "GPT返回信息错误");
            } else {
                requestEnd(task, reqStr);
            }

            return task;
        }).catch((error) => {
            const err: string = error.message;
            const task: ITask = { sText: content, row: [] };
            requestErr(task, err);
            return task;
        });

        return taskPromise;
    }

    /**
     * @description 请求错误时，输出错误信息
     */
    function requestErr(task: ITask, errMsg: string) {
        console.warn(`警告：\n${errMsg}\n`)
        task.state = TaskState.error;
        task.errorMsg = errMsg;
    }

    /**
     * @description 请求结束时，判断返回的数据是否正确
     */
    function requestEnd(task: ITask, req: string) {
        let reqArr: string[] = JSON.parse(req);
        if (reqArr.length !== task.sText.length) {
            requestErr(task, `源文本和翻译文本长度不一致: 原文 ${task.sText.length} 个----译文 ${reqArr.length} 个`);
            return;
        }

        console.log(`完成：\n${reqArr}\n`);
        task.tText = reqArr;
        task.state = TaskState.finished;
    }
}