async function getTab() {
    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true }) ?? [];
    return tab;
}

const inertComplete = {};
const inertScript = async () => {
    const tab = await getTab();
    if (!tab) return;
    if (tab.status === 'loading') {
        delete inertComplete[tab.id];
    }
    if (inertComplete[tab.id] || !/^https?:\/\//.test(tab.url) || tab.status !== 'complete') return

    chrome.storage.local.get(['scope_all', 'scope_domain', 'scope_iframe'], async function({ scope_all = false, scope_domain = [], scope_iframe = false } = {}) {
        const origin = tab.url.match(/^https?:\/\/[^\/]+/)?.[0];
        const domainChecked = scope_domain.includes(origin);
        const inert = domainChecked || scope_all;
        if (inert) {
            inertComplete[tab.id] = 1;
            chrome.scripting
            .executeScript({
              target : { tabId: tab.id, allFrames: scope_iframe },
              files : [ "./insert_script.js" ],
            })
            .then(() => console.log("script injected in all frames"))
            .catch((err) => {
                console.error(err)
                inertComplete[tab.id] = 0;
            })
        }
    })
}

inertScript();
chrome.tabs.onUpdated.addListener(inertScript);
chrome.storage.onChanged.addListener(inertScript);


