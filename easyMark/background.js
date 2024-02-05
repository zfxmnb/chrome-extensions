const ColorEnum = ['transparent', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#00FFFF', '#FF00FF']

async function getTab() {
    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true }) ?? [];
    return tab;
}

function draw (color) {
    const canvas = new OffscreenCanvas(16, 16);
    const ctx = canvas.getContext('2d');
    ctx.beginPath();
    ctx.arc(8, 8, 7, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.stroke();
    const imageData = ctx.getImageData(0, 0, 16, 16);
    chrome.action.setIcon({ imageData });
}

async function updateIcon () {
    const tab = await getTab();
    if (!tab || tab.status !== 'complete' || !/^https?:\/\//.test(tab.url)) {
        draw(ColorEnum[0]);
        return
    }

    chrome.storage.local.get(['status'], async function({ status } = { status: {} }) {
        const [_, origin, pathname] = tab.url.match(/(^https?:\/\/[^\/]+)(\S*)/) ?? [];
        let colorType = 0;
        if (status?.[origin]?.[pathname] >= 0) {
            colorType = status?.[origin]?.[pathname]
        }
        draw(ColorEnum[colorType]);
    })
}

updateIcon();
chrome.tabs.onActivated.addListener(updateIcon);
chrome.tabs.onUpdated.addListener(updateIcon);
chrome.storage.onChanged.addListener(updateIcon);


