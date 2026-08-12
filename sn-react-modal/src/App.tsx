import { useState, useEffect } from 'react'
import './App.css'

// @ts-ignore - JSX component without TypeScript declarations
import LinkSalesforceRecord from './components/Link'
import CreateSalesforceRecord from './components/Create'





function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ')
}

type TabKey = 'link' | 'create'
type Ctx = { table?: string | null; sys_id?: string | null }

export default function App({ctx}: {ctx?: Ctx}) {
	const [tab, setTab] = useState<TabKey>('link')
	const [syncConfigured, setSyncConfigured] = useState<boolean>(false);

	useEffect(() => {
		const fetchSettings = async () => {
			try {
				const settingsResponse = await fetch(
					`/api/x_peekl_salesfor_0/x_peekl_salesfor_0_salesforce_integratio/salesforce/settings?servicenow_table=${ctx?.table}`,
					{
					headers: {
						Accept: 'application/json',
						'X-UserToken': (window as any).g_ck || ''
					}
					}
				);

				if (settingsResponse.ok) {
					const configData = await settingsResponse.json();
					setSyncConfigured(configData.isSyncing);
				}else{
					setSyncConfigured(false)
				}
			} catch (e: unknown) {
			console.error(e);
			}
		};

		fetchSettings();
	}, []);
	return (
		<div className="pm-shell">
			{!syncConfigured ? 
				<div>
					<p>Table {ctx?.table} is not configured in Salesforce to be synced.</p>
				</div>
				:
				<>
					<div className="pm-tabs">
						<button
						className={cx('pm-tab', tab === 'link' && 'pm-tabActive')}
						onClick={() => setTab('link')}
						type="button"
						>
						Link SalesForce record
						</button>
						<button
						className={cx('pm-tab', tab === 'create' && 'pm-tabActive')}
						onClick={() => setTab('create')}
						type="button"
						>
						Create SalesForce Record
						</button>
					</div>

					{tab === 'link' ? <LinkSalesforceRecord servicenowTable={ctx?.table} servicenowSysId={ctx?.sys_id}/> : <CreateSalesforceRecord servicenowTable={ctx?.table} servicenowSysId={ctx?.sys_id} />}
				</>
			}
			
		</div>
  	)
}
