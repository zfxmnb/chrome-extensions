
async function getTab() {
    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true }) ?? [];
    return tab;
}

const allEle = document.querySelector("#checkbox_all");
const currentEle = document.querySelector("#checkbox_current");
const iframeELE = document.querySelector('#checkbox_iframe');
const clearDomainsEle = document.querySelector('#clear_domains');

async function updateStatus() {
    const tab = await getTab();
    if (!tab?.url || !/^https?:\/\/[^\/]+/.test(tab.url) || tab?.status !== 'complete') {
        currentEle.parentNode.classList.add('disabled');
        currentEle.checked = false;
        return 
    }
    chrome.storage.local.get(['scope_all', 'scope_domain', 'scope_iframe'], async function({ scope_all = false, scope_domain = [], scope_iframe = false} = {}) {
        allEle.checked = scope_all;
        iframeELE.checked = scope_iframe;
        const origin = tab.url.match(/^https?:\/\/[^\/]+/)?.[0];
        const domainChecked = scope_domain.includes(origin);
        currentEle.parentNode.classList.remove('disabled');
        currentEle.checked = domainChecked;
    });
}

updateStatus();
chrome.tabs.onActivated.addListener(updateStatus);
chrome.storage.onChanged.addListener(updateStatus);
chrome.tabs.onUpdated.addListener(updateStatus);

allEle.addEventListener('change', (e) => {
    const checked = e.target.checked;
    chrome.storage.local.set({'scope_all': checked});
})

currentEle.addEventListener('change', (e) => {
    const checked = e.target.checked;
    chrome.storage.local.get(['scope_domain'], async ({ scope_domain = []  }) => {
        const tab = await getTab();
        const origin = tab.url.match(/^https?:\/\/[^\/]+/)?.[0];
        if (checked && !scope_domain.includes(origin)) {
            scope_domain.push(origin);
            chrome.storage.local.set({'scope_domain': scope_domain.filter((domain) => domain) });
        }
        if (!checked) {
            chrome.storage.local.set({'scope_domain': scope_domain.filter((domain) => domain && domain !== origin) });
        }
    })
})

clearDomainsEle.addEventListener('click', (e) => {
    const checked = e.target.checked;
    if (confirm('确认执行清除操作！')) {
        chrome.storage.local.set({'scope_domain': [] });
    }
})

iframeELE.addEventListener('change', (e) => {
    const checked = e.target.checked;
    chrome.storage.local.set({'scope_iframe': checked});
    chrome.storage.local.get(['scope_all', 'scope_domain'], async ({ scope_all = false, scope_domain = []  }) => {
        const tab = await getTab();
        const origin = tab.url.match(/^https?:\/\/[^\/]+/)?.[0];
        if (checked && (scope_all || scope_domain.includes(origin)) && confirm('需要刷新页面才会生效!')) {
            chrome.tabs.reload(tab.id);
        }
    })
})
