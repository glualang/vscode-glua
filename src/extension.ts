/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

'use strict';

import * as vscode from 'vscode';
import { WorkspaceFolder, DebugConfiguration, ProviderResult, CancellationToken } from 'vscode';
import { GluaDebugSession } from './gluaDebug';
// import { setCurrentTraceId } from './gluaRpcClient';
import * as Net from 'net';
import * as path from 'path'
import * as fs from 'fs'
import { GluaRpcClient, setCurrentContractId, getCurrentContractId, getCurrenContractApi, getDefaultRpcEndpoint, setRpcEndpoint } from './gluaRpcClient';
import { ContractsNodeProvider } from './contractExplorer'
import { ContractInfoPanel } from './contractInfoPanel'
import * as child_process from 'child_process'
import { URL } from 'url';
// const child_process = require('child_process')

/*
 * The compile time flag 'runMode' controls how the debug adapter is run.
 * Please note: the test suite only supports 'external' mode.
 */
const runMode: 'external' | 'server' | 'inline' = 'inline';

export function activate(context: vscode.ExtensionContext) {

	const rpcClient = new GluaRpcClient();

	context.subscriptions.push(vscode.commands.registerCommand('extension.trace-debug.getProgramName', config => {
		return vscode.window.showInputBox({
			placeHolder: "Please enter the name of a markdown file in the workspace folder",
			value: "readme.md"
		});
	}));

	context.subscriptions.push(vscode.commands.registerCommand('extension.openContractPage', (contractAddress) => {
		console.log('extension.openContractPage called contract ', contractAddress)
		// 打开一个web view页面展示合约的信息，storage信息，API列表，events列表，合约交易历史等
		ContractInfoPanel.createOrShow(context.extensionPath, contractAddress)
	}))

	if (vscode.window.registerWebviewPanelSerializer) {
		// Make sure we register a serializer in activation event

		vscode.window.registerWebviewPanelSerializer(ContractInfoPanel.viewType, {
			async deserializeWebviewPanel(webviewPanel: vscode.WebviewPanel, state: any) {
				console.log(`Got state: ${state}`);
				const contractAddress = state || ''
				ContractInfoPanel.revive(webviewPanel, context.extensionPath, contractAddress);
			}
		});
	}

	context.subscriptions.push(vscode.commands.registerCommand('gluaDebug.setEndpoint', async () => {
		// 设置simplechain的RPC endpoint
		const endpoint = await vscode.window.showInputBox({
			placeHolder: `Please enter the rpc endpoint of simplechan(default ${getDefaultRpcEndpoint()})`,
			value: ''
		})
		if(!endpoint) {
			return
		}
		let url: URL
		try {
			url = new URL(endpoint)
		} catch(e) {
			vscode.window.showErrorMessage(`invalid endpoint url`)
			return
		}
		setRpcEndpoint(url.toString())
		vscode.window.showInformationMessage(`updated glua debug endpoint`)
	}));

	context.subscriptions.push(vscode.commands.registerCommand('gluaDebug.invokeContract', async () => {
		// 发出调用合约的命令
		const currentContractId = getCurrentContractId() || '';
		const currentContractAPi = getCurrenContractApi() || '';
		if (!currentContractId || !currentContractAPi) {
			vscode.window.showErrorMessage(`please select a contract and api to debugger in explorer`)
			return
		}
		console.log(`current contractAddress, apiName set to ${currentContractId}, ${currentContractAPi}`)


		// 让用户输入合约调用参数
		const apiArg = await vscode.window.showInputBox({
			placeHolder: "Please enter the invoke argument",
			value: ''
		})
		const invokeRes = await rpcClient.invokeContract(currentContractId, currentContractAPi, [apiArg])
		console.log(`debugger invoke contract response`, invokeRes)
		if (!invokeRes.exec_succeed) {
			vscode.window.showErrorMessage(`run error ${invokeRes.api_result}`)
			return
		}
		vscode.window.showInformationMessage(`result: ${invokeRes.api_result}`)
	}));

	context.subscriptions.push(vscode.commands.registerCommand('gluaDebug.depositContract', async () => {
		// 发出充值到选中的合约的命令
		const depositAssetIdStr = await vscode.window.showInputBox({
			placeHolder: `please enter deposit asset id(uint64) default 0`,
			value: ''
		}) || '0'
		const checkAssetId = (assetIdStr: string): number | undefined => {
			if(assetIdStr.length < 1) {
				return undefined
			}
			try {
				const n = parseInt(assetIdStr)
				if(n === undefined || n < 0) {
					return undefined
				}
				return n
			} catch(e) {
				return undefined
			}
		}
		const assetId = checkAssetId(depositAssetIdStr)
		if(assetId === undefined) {
			vscode.window.showErrorMessage(`invalid deposit asset id format`)
			return
		}
		const depositAmountStr = await vscode.window.showInputBox({
			placeHolder: `please enter deposit amount`,
			value: ''
		}) || ''
		const checkAmount = (amountStr: string): number | undefined => {
			if(amountStr.length < 1) {
				return undefined
			}
			try {
				const n = parseInt(amountStr)
				if(n === undefined || n <= 0) {
					return undefined
				}
				return n
			} catch(e) {
				return undefined
			}
		}
		const amount = checkAmount(depositAmountStr)
		if(amount === undefined) {
			vscode.window.showErrorMessage(`invalid deposit amount format`)
			return
		}
		const currentContractId = getCurrentContractId() || '';
		if (!currentContractId) {
			vscode.window.showErrorMessage(`please select a contract to deposit in contract explorer`)
			return
		}
		const res = await rpcClient.depositToContract(currentContractId, [], assetId, amount)
		console.log(`deposit to contract response`, res)
		vscode.window.showInformationMessage(`send a deposit to contract transaction(need generate block to work)`)
	}));

	context.subscriptions.push(vscode.commands.registerCommand('gluaDebug.generateBlock', async () => {
		// 发出让链产块的命令
		const res = await rpcClient.generateBlock()
		console.log(`generate block response`, res)
		vscode.window.showInformationMessage(`1 block generated`)
	}));

	context.subscriptions.push(vscode.commands.registerCommand('gluaDebug.compileContract', () => {
		let gluacProgram = 'gluac'
		if(process.platform==='win32') {
			gluacProgram = 'gluac.exe'
		}
		const activeEditor = vscode.window.activeTextEditor
		if(!activeEditor) {
			vscode.window.showErrorMessage(`please open the source file to compile`)
			return
		}
		const currentlyOpenTabfilePath = activeEditor.document.fileName || '';
		const sourceFile = currentlyOpenTabfilePath
		const sourceFileBaseName = path.basename(sourceFile);
		const metaProcess = child_process.spawn(gluacProgram, ['-target=meta', '-vm=glua', sourceFile])
		// log process output
		metaProcess.on('data', (chunk) => {
			console.log('meta code info compile output', chunk)
		})
		metaProcess.on('close', (code) => {
			console.log(`gluac generate meta file exited with code ${code}`);
			if (code !== 0) {
				vscode.window.showErrorMessage(`compile ${sourceFileBaseName} error`)
				return
			}
			const metaFilePath = sourceFile + '.gen.meta.json'
			// 根据源码和meta file编译并产生gpc文件
			const gpcProcess = child_process.spawn(gluacProgram, ['-target=binary', '-vm=glua', '-package', `-meta=${metaFilePath}`, sourceFile])
			gpcProcess.on('close', (code) => {
				console.log(`gluac generate gpc file exited with code ${code}`);
				if (code !== 0) {
					vscode.window.showErrorMessage(`compile ${sourceFileBaseName} error`)
					return
				}
				const gpcFilePath = sourceFile + '.gpc'
				const gpcFileBaseName = path.basename(gpcFilePath)
				vscode.window.showInformationMessage(`contract ${gpcFileBaseName} generated`)
			})
		})
	}));

	context.subscriptions.push(vscode.commands.registerCommand('gluaDebug.deployContract', () => {
		const activeEditor = vscode.window.activeTextEditor
		if(!activeEditor) {
			vscode.window.showErrorMessage(`please open the source file to compile`)
			return
		}
		const currentlyOpenTabfilePath = activeEditor.document.fileName || '';
		let sourceFile = currentlyOpenTabfilePath
		if(path.extname(sourceFile) !== '.gpc') {
			const gpcFile = sourceFile + '.gpc'
			if(fs.existsSync(gpcFile)) {
				sourceFile = gpcFile;
			} else {
				vscode.window.showErrorMessage(`please compile the source contract file first`)
				return
			}
		}
		const sourceFileBaseName = path.basename(sourceFile);
		const contractFile = sourceFile
		rpcClient.deployContract(contractFile)
			.then(res => {
				console.log('deploy contract res', res)
				const contractId = res
				setCurrentContractId(contractId)
				vscode.window.showInformationMessage(`deployed contract ${contractId} successfully`)
				// TODO: mapping contractId to source file path

				// trigger contract list view refresh
				contractsNodeProvider.refresh()
			})
			.catch(e => {
				console.log(`deploy contract ${sourceFileBaseName} error`, e)
			})
	}));

	// register a configuration provider for 'gluadebug' debug type
	const provider = new MockConfigurationProvider();
	context.subscriptions.push(vscode.debug.registerDebugConfigurationProvider('gluadebug', provider));

	// register a dynamic configuration provider for 'gluadebug' debug type
	context.subscriptions.push(vscode.debug.registerDebugConfigurationProvider('gluadebug', {
		provideDebugConfigurations(folder: WorkspaceFolder | undefined): ProviderResult<DebugConfiguration[]> {
			return [
				{
					name: "Dynamic Launch",
					request: "launch",
					type: "node",
					program: "${file}"
				},
				{
					name: "Another Dynamic Launch",
					request: "launch",
					type: "node",
					program: "${file}"
				},
				{
					name: "Mock Launch",
					request: "launch",
					type: "node",
					program: "${file}"
				}
			];
		}
	}, vscode.DebugConfigurationProviderTriggerKind.Dynamic));

	// debug adapters can be run in different ways by using a vscode.DebugAdapterDescriptorFactory:
	let factory: vscode.DebugAdapterDescriptorFactory;
	switch (runMode) {
		case 'server':
			// run the debug adapter as a server inside the extension and communicating via a socket
			factory = new MockDebugAdapterDescriptorFactory();
			break;

		case 'inline':
			// run the debug adapter inside the extension and directly talk to it
			factory = new InlineDebugAdapterFactory();
			break;

		case 'external': default:
			// run the debug adapter as a separate process
			factory = new DebugAdapterExecutableFactory();
			break;
	}

	context.subscriptions.push(vscode.debug.registerDebugAdapterDescriptorFactory('gluadebug', factory));
	if ('dispose' in factory) {
		context.subscriptions.push(factory);
	}

	// override VS Code's default implementation of the debug hover
	/*
	vscode.languages.registerEvaluatableExpressionProvider('markdown', {
		provideEvaluatableExpression(document: vscode.TextDocument, position: vscode.Position): vscode.ProviderResult<vscode.EvaluatableExpression> {
			const wordRange = document.getWordRangeAtPosition(position);
			return wordRange ? new vscode.EvaluatableExpression(wordRange) : undefined;
		}
	});
	*/

	// 左侧需要可以查看当前注册在simplechain中的合约列表以及合约的各API和storages等
	const contractsNodeProvider = new ContractsNodeProvider();
	vscode.window.registerTreeDataProvider('contractNodes', contractsNodeProvider);
	vscode.window.registerTreeDataProvider('contractNodesInDebugView', contractsNodeProvider);
	vscode.commands.registerCommand('extension.setContractIdAndApiToDebug', (contractId: string, apiName: string) => {
		setCurrentContractId(contractId, apiName)
		vscode.window.showInformationMessage(`selected contractId and ${apiName} to debugger`);
		// 更新tree view的显示(selected)
		contractsNodeProvider.refresh()
	})

}

export function deactivate() {
	// nothing to do
}

class MockConfigurationProvider implements vscode.DebugConfigurationProvider {

	/**
	 * Massage a debug configuration just before a debug session is being launched,
	 * e.g. add all missing attributes to the debug configuration.
	 */
	resolveDebugConfiguration(folder: WorkspaceFolder | undefined, config: DebugConfiguration, token?: CancellationToken): ProviderResult<DebugConfiguration> {

		// if launch.json is missing or empty
		if (!config.type && !config.request && !config.name) {
			const editor = vscode.window.activeTextEditor;
			const editorLang = editor && editor.document.languageId
			const filename = editor && editor.document.fileName
			if (editor && (editorLang === 'glua' || editorLang === 'lua' || (filename && filename.endsWith('.glua')))) {
				config.type = 'gluadebug';
				config.name = 'Launch';
				config.request = 'launch';
				config.program = '${file}';
				config.stopOnEntry = true;
			}
		}

		if (!config.program) {
			return vscode.window.showInformationMessage("Cannot find a program to debug").then(_ => {
				return undefined;	// abort launch
			});
		}

		return config;
	}
}

class DebugAdapterExecutableFactory implements vscode.DebugAdapterDescriptorFactory {

	// The following use of a DebugAdapter factory shows how to control what debug adapter executable is used.
	// Since the code implements the default behavior, it is absolutely not neccessary and we show it here only for educational purpose.

	createDebugAdapterDescriptor(_session: vscode.DebugSession, executable: vscode.DebugAdapterExecutable | undefined): ProviderResult<vscode.DebugAdapterDescriptor> {
		// param "executable" contains the executable optionally specified in the package.json (if any)

		// use the executable specified in the package.json if it exists or determine it based on some other information (e.g. the session)
		if (!executable) {
			const command = "absolute path to my DA executable";
			const args = [
				"some args",
				"another arg"
			];
			const options = {
				cwd: "working directory for executable",
				env: { "VAR": "some value" }
			};
			executable = new vscode.DebugAdapterExecutable(command, args, options);
		}

		// make VS Code launch the DA executable
		return executable;
	}
}

class MockDebugAdapterDescriptorFactory implements vscode.DebugAdapterDescriptorFactory {

	private server?: Net.Server;

	createDebugAdapterDescriptor(session: vscode.DebugSession, executable: vscode.DebugAdapterExecutable | undefined): vscode.ProviderResult<vscode.DebugAdapterDescriptor> {

		if (!this.server) {
			// start listening on a random port
			this.server = Net.createServer(socket => {
				const session = new GluaDebugSession();
				session.setRunAsServer(true);
				session.start(<NodeJS.ReadableStream>socket, socket);
			}).listen(0);
		}

		// make VS Code connect to debug server
		return new vscode.DebugAdapterServer((<Net.AddressInfo>this.server.address()).port);
	}

	dispose() {
		if (this.server) {
			this.server.close();
		}
	}
}

class InlineDebugAdapterFactory implements vscode.DebugAdapterDescriptorFactory {

	createDebugAdapterDescriptor(_session: vscode.DebugSession): ProviderResult<vscode.DebugAdapterDescriptor> {
		return new vscode.DebugAdapterInlineImplementation(new GluaDebugSession());
	}
}
