
const ColorEnum = ['transparent', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#00FFFF', '#FF00FF']

async function getTab() {
    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true }) ?? [];
    return tab;
}

const containerEle = document.querySelector('.container');
const metaDataEle = document.querySelector('.meta_data');
const closeEle = document.querySelector('.close');
const openEle = document.querySelector('.open');
const mergeEle = document.querySelector('.merge');

let items = '';
ColorEnum.forEach((color, index) => {
    items += `<div class="item row">
        <input type="radio" name="color" id="c${index}" name="all" value="${index}" ${index === 0 ? 'checked': ''}/>
        <label for="c${index}"><div class="color" data-color="${color}" style="background-color:${color};"></div></label>
    </div>\n`
})
containerEle.innerHTML = items;
const radios = document.querySelectorAll('[name="color"]');

radios.forEach((radio) => {
    radio.addEventListener('change', async (e) => {
        const tab = await getTab();
        const checked = e.target.checked;
        if (checked) {
            chrome.storage.local.get(['status'], async function({ status } = { status: {} }) {
                if (tab?.url && /^https?:\/\/[^\/]+/.test(tab.url)) {
                    const [_, origin, pathname] = tab.url.match(/(^https?:\/\/[^\/]+)(\S*)/) ?? [];
                    status = status ?? {};
                    status[origin] = status?.[origin] ?? {};
                    const value = Number(e.target.value);
                    if (value <= 0) {
                        delete status[origin][pathname];
                        if (!Object.keys(status[origin])?.length) {
                            delete status[origin]
                        }
                    } else {
                        status[origin][pathname] = value
                    }
                    chrome.storage.local.set({ status });
                }
            });
        }
    })
})

async function updateStatus() {
    const tab = await getTab();
    if (!tab?.url || !/^https?:\/\/[^\/]+/.test(tab.url) || tab?.status !== 'complete') {
        containerEle.classList.add('disabled');
        radios.forEach((radio, index) => {
           index === 0 ? radio.setAttribute('checked', '') : radio.removeAttribute('checked');
        })
        return
    }
    chrome.storage.local.get(['status'], async function({ status } = { status: {} }) {
        const [_, origin, pathname] = tab.url.match(/(^https?:\/\/[^\/]+)(\S*)/) ?? [];
        let colorType = 0;
        if (status?.[origin]?.[pathname] >= 0) {
            colorType = status?.[origin]?.[pathname]
        }
        radios.forEach((radio) => {
            Number(radio.value) === colorType ? radio.setAttribute('checked', '') : radio.removeAttribute('checked');
        })
        containerEle.classList.remove('disabled');
    });
}

updateStatus();
chrome.tabs.onActivated.addListener(updateStatus);
chrome.storage.onChanged.addListener(updateStatus);
chrome.tabs.onUpdated.addListener(updateStatus);

openEle.addEventListener('click', () => {
    metaDataEle.classList.remove('hide');
    closeEle.classList.remove('hide');
    openEle.classList.add('hide');
    chrome.storage.local.get(['status'], async function({ status } = { status: {} }) {
        status = status ?? {};
        metaDataEle.value = JSON.stringify(status)
    });
})

closeEle.addEventListener('click', () => {
    metaDataEle.classList.add('hide');
    closeEle.classList.add('hide');
    mergeEle.classList.add('hide');
    openEle.classList.remove('hide');
})

metaDataEle.addEventListener('input', () => {
    if (/^\{/.test(metaDataEle.value?.trim?.())) {
        mergeEle.classList.remove('hide');
    }
})

mergeEle.addEventListener('click', () => {
        try {
            if (!/^\{/.test(metaDataEle.value?.trim?.())) throw 0;
            const data = JSON.parse(metaDataEle.value);
            chrome.storage.local.get(['status'], async function({ status } = { status: {} }) {
                if (confirm('合并元数据，如果有冲突以导入数据为准')) {
                    status = status ?? {};
                    Object.keys(data).forEach((k1) => {
                        if (/^https?:\/\/[^\/]+$/.test(k1)) {
                            if (status[k1]) {
                                Object.keys(data[k1]).forEach((k2) => {
                                    status[k1][k2] =  Number(data[k1][k2]) || status[k1][k2] || 0
                                })
                            } else {
                                status[k1] = data[k1]
                            }
                        }
                    })
                    chrome.storage.local.set({ status });
                    mergeEle.classList.add('hide');
                }
            });
        } catch (err) {
            alert('非有效JSON字符串!')
        }
})