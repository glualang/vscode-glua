import * as vscode from 'vscode';
// import * as fs from 'fs';
// import * as path from 'path';
import {GluaRpcClient, getCurrentContractId, getCurrenContractApi} from './gluaRpcClient';

const rpcClient = new GluaRpcClient();

export class ContractsNodeProvider implements vscode.TreeDataProvider<vscode.TreeItem> {

	private _onDidChangeTreeData: vscode.EventEmitter<ContractNode | ApiNode | undefined> = new vscode.EventEmitter<ContractNode | ApiNode | undefined>();
	readonly onDidChangeTreeData: vscode.Event<ContractNode | ApiNode | undefined> = this._onDidChangeTreeData.event;

	constructor() {
	}

	refresh(): void {
		console.log('ContractsNodeProvider refresh')
		this._onDidChangeTreeData.fire(undefined);
	}

	getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
		return element;
	}

	getChildren(element?: vscode.TreeItem): Thenable<vscode.TreeItem[]> {
		console.log('ContractsNodeProvider getChildren called with element', element)

		if (element) {
			// 如果是trace node,则显示trace下各span
			if(element.contextValue === 'contract') {
				return this.getApiNodeList((<ContractNode>element).contractId)
			} else {
				// 如果是span node，不显示下级
				return Promise.resolve([]);
			}
		} else {
			return this.getContractNodeList();
		}

	}

	private async getApiNodeList(contractId: string): Promise<vscode.TreeItem[]> {
		const contractInfo = await rpcClient.getContractInfoWithCache(contractId)
		console.log('contractInfo', contractInfo)
		const toNode = (apiName: any): ApiNode => {
			return new ApiNode(apiName, contractId, vscode.TreeItemCollapsibleState.None, {
				command: 'extension.setContractIdAndApiToDebug',
				title: '',
				arguments: [contractId, apiName]
			})
		}
		const apiNames: Array<any> = []
		for(const item of contractInfo.abi) {
			apiNames.push(item)
		}
		for(const item of contractInfo.offline_abi) {
			apiNames.push(item)
		}
		const spanNodes = apiNames.map(toNode)
		return spanNodes
	}

	private async getContractNodeList(): Promise<vscode.TreeItem[]> {
		const res = await rpcClient.listContracts()
		console.log('contract list', res)
		const toNode = (item: any): ContractNode => {
			return new ContractNode(item, item,
				vscode.TreeItemCollapsibleState.Collapsed,
				{
					command: 'extension.openContractPage',
					title: '',
					arguments: [item]
				})
		}
		const traceNodes = res.map(toNode)
		return traceNodes
	}
}

export class ContractNode extends vscode.TreeItem {
	constructor(
		public readonly label: string,
		public contractId: string,
		public readonly collapsibleState: vscode.TreeItemCollapsibleState,
		public readonly command?: vscode.Command
	) {
		super(label, collapsibleState);
	}

	get tooltip(): string {
		if(getCurrentContractId() === this.contractId) {
			return `${this.label}-${this.contractId}-selected`
		}
		return `${this.label}-${this.contractId}`;
	}

	get description(): string {
		if(getCurrentContractId() === this.contractId) {
			return `${this.contractId}-selected`
		}
		return this.contractId;
	}

	// iconPath = {
	// 	light: path.join(__filename, '..', '..', 'resources', 'light', 'dependency.svg'),
	// 	dark: path.join(__filename, '..', '..', 'resources', 'dark', 'dependency.svg')
	// };

	contextValue = 'contract';
}

export class ApiNode extends vscode.TreeItem {
	constructor(public apiName: string, public contractId: string,
		  public readonly collapsibleState: vscode.TreeItemCollapsibleState,
		public readonly command?: vscode.Command) {
		super(`${apiName}`, collapsibleState)
	}

	get tooltip(): string {
		if(getCurrentContractId() === this.contractId && getCurrenContractApi() === this.apiName) {
			return `${this.apiName}-selected`
		}
		return `${this.apiName}`;
	}

	get description(): string {
		if(getCurrentContractId() === this.contractId && getCurrenContractApi() === this.apiName) {
			return `${this.apiName}-selected`
		}
		return `${this.apiName}`;
	}

	// iconPath = {
	// 	light: path.join(__filename, '..', '..', 'resources', 'light', 'dependency.svg'),
	// 	dark: path.join(__filename, '..', '..', 'resources', 'dark', 'dependency.svg')
	// };

	contextValue = 'api';
}