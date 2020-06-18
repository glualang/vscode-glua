import * as vscode from 'vscode';
import * as path from 'path'
import {getRpcEndpoint} from './gluaRpcClient'

export class ContractInfoPanel {
	public static currentPanel: ContractInfoPanel | undefined
	public static readonly viewType = 'contractInfo'
	private contractAddress: string
	private readonly _panel: vscode.WebviewPanel;
	private readonly _extensionPath: string;
	private _disposables: vscode.Disposable[] = [];

	public static createOrShow(extensionPath: string, contractAddress: string) {
		const column = vscode.window.activeTextEditor
			? vscode.window.activeTextEditor.viewColumn
			: undefined;

		// If we already have a panel, show it.
		if (ContractInfoPanel.currentPanel) {
			ContractInfoPanel.currentPanel.contractAddress = contractAddress
			ContractInfoPanel.currentPanel._update()
			ContractInfoPanel.currentPanel._panel.reveal(column);
			return;
		}

		// Otherwise, create a new panel.
		const panel = vscode.window.createWebviewPanel(
			ContractInfoPanel.viewType,
			'Contract ' + contractAddress,
			column || vscode.ViewColumn.One,
			{
				// Enable javascript in the webview
				enableScripts: true,

				// And restrict the webview to only loading content from our extension's `media` directory.
				localResourceRoots: [vscode.Uri.file(path.join(extensionPath, 'media'))]
			}
		);

		ContractInfoPanel.currentPanel = new ContractInfoPanel(panel, extensionPath, contractAddress);
	}

	public static revive(panel: vscode.WebviewPanel,
		 extensionPath: string, contractAddress: string) {
		ContractInfoPanel.currentPanel = new ContractInfoPanel(panel, extensionPath, contractAddress);
	}

	private constructor(panel: vscode.WebviewPanel,
		 extensionPath: string, contractAddress: string) {
		this._panel = panel;
		this._extensionPath = extensionPath;
		this.contractAddress = contractAddress

		// Set the webview's initial html content
		this._update();

		// Listen for when the panel is disposed
		// This happens when the user closes the panel or when the panel is closed programatically
		this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

		// Update the content based on view changes
		this._panel.onDidChangeViewState(
			e => {
				if (this._panel.visible) {
					this._update();
				}
			},
			null,
			this._disposables
		);

		// Handle messages from the webview
		this._panel.webview.onDidReceiveMessage(
			message => {
				switch (message.command) {
					case 'alert':
						vscode.window.showErrorMessage(message.text);
						return;
				}
			},
			null,
			this._disposables
		);
	}

	public doRefactor() {
		// Send a message to the webview webview.
		// You can send any JSON serializable data.
		this._panel.webview.postMessage({ command: 'refactor' });
	}

	public dispose() {
		ContractInfoPanel.currentPanel = undefined;

		// Clean up our resources
		this._panel.dispose();

		while (this._disposables.length) {
			const x = this._disposables.pop();
			if (x) {
				x.dispose();
			}
		}
	}

	private _update() {
		const webview = this._panel.webview;

		this._updateForContract(webview, this.contractAddress)

		// Vary the webview's content based on where it is located in the editor.
		// switch (this._panel.viewColumn) {
		// 	case vscode.ViewColumn.Two:
		// 		this._updateForCat(webview, 'Compiling Cat');
		// 		return;

		// 	case vscode.ViewColumn.Three:
		// 		this._updateForCat(webview, 'Testing Cat');
		// 		return;

		// 	case vscode.ViewColumn.One:
		// 	default:
		// 		this._updateForCat(webview, 'Coding Cat');
		// 		return;
		// }
	}

	private _updateForContract(webview: vscode.Webview, contractAddress: string) {
		this._panel.title = `Contract Info ${contractAddress}`;
		this._panel.webview.html = this._getHtmlForWebview(webview, contractAddress);
	}

	private _getHtmlForWebview(webview: vscode.Webview, contractAddress: string) {
		// Local path to main script run in the webview
		const scriptPathOnDisk = vscode.Uri.file(
			path.join(this._extensionPath, 'media', 'main.js')
		);

		// And the uri we use to load this script in the webview
		const scriptUri = webview.asWebviewUri(scriptPathOnDisk);
		const vueScriptUri = webview.asWebviewUri(vscode.Uri.file(
			path.join(this._extensionPath, 'media', 'vue.min.js')
		))
		const cssUri = webview.asWebviewUri(vscode.Uri.file(
			path.join(this._extensionPath, 'media', 'styles.css')
		))
		const bootstrapCssUri = webview.asWebviewUri(vscode.Uri.file(
			path.join(this._extensionPath, 'media', 'bootstrap.min.css')
		))
		const axiosScriptUri = webview.asWebviewUri(vscode.Uri.file(
			path.join(this._extensionPath, 'media', 'axios.min.js')
		))

		console.log(`vueScriptUri`, vueScriptUri)
		console.log(`scriptUri`, scriptUri)
		console.log(`cssUri`, cssUri)

		// for dev

		// Use a nonce to whitelist which scripts can be run
		const nonce = getNonce();

		return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <!-- <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} https:; script-src 'nonce-${nonce}';"> -->
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
				<title>Cat Coding</title>
				<link href="${bootstrapCssUri}" rel="stylesheet">
				<link rel="stylesheet" nonce="${nonce}" href="${cssUri}" />
				<script src="${axiosScriptUri}"></script>
				<script src="${vueScriptUri}"></script>
            </head>
			<body>
				<div class="container" id="app">
					<h1>Contract</h1>
					<div class="alert alert-primary" role="alert">
					${contractAddress}
					</div>
					<div class="card">
						<div class="card-body">
							<h5 class="card-title">API</h5>
							<div>
								<span class="badge badge-warning" style="margin-right: 10px;" v-for="(api, index) in contractInfo.apis" :key="index">{{api}}</span>
							</div>
						</div>
					</div>

					<div class="card">
						<div class="card-body">
							<h5 class="card-title">offline API</h5>
							<div>
								<span class="badge badge-warning" style="margin-right: 10px;" v-for="(api, index) in contractInfo.offlineApis" :key="index">{{api}}</span>
							</div>
						</div>
					</div>
					<div class="card">
						<div class="card-body">
							<h5 class="card-title">Storages</h5>
							<ul class="list-group">
								<li class="list-group-item" v-for="(storageProp, index) in contractInfo.storageProperties" :key="index">
									<span class="badge badge-warning">{{storageProp[0]}}</span>
									<span>&nbsp;value: {{contractInfo.storageValues[storageProp[0]]||''}}</span>
								</li>
							</ul>
						</div>
					</div>
				</div>
				<script>
					var contractAddress = '${contractAddress}';
					var rpcEndpoint = '${getRpcEndpoint()}';
				</script>
                <script nonce="${nonce}" src="${scriptUri}"></script>
            </body>
            </html>`;
	}
}

function getNonce() {
	let text = '';
	const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	for (let i = 0; i < 32; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return text;
}