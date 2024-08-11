class LeaflowAmber {
    processing = false
    synced = false

    guest_id = undefined
    assistant_token = undefined
    assistant_name = "助理"
    welcome_message = "你好，我是智能助理，你可以发送消息来问我问题。如果要清除聊天记录，请发送 /clear 。"
    message_cleared = "消息记录已经清除。"

    error_message = "发送消息的时候出了点问题，要不试试 /reset 来重置一下？"
    after_reset_message = "已重置会话。"

    button_css = "leaflow-amber-show-chat-button"


    constructor(config, guest_id) {

        if (!config.assistant_token) {
            // error
            throw new Error("assistant_token is required")
        } else {
            this.assistant_token = config.assistant_token;
        }

        if (config.assistant_name) {
            this.assistant_name = config.assistant_name
        }

        if (config.welcome_message) {
            this.welcome_message = config.welcome_message
        }

        if (config.button_css) {
            this.button_css = config.button_css
        }


        if (guest_id) {
            this.guest_id = guest_id;
        } else {
            this.getGuestId()
        }

    }

    amberContainer() {
        return document.querySelector('#leaflow-amber-chat')
    }
    hideChatButton() {
        return document.querySelector("#leaflow-amber-hide-chat")
    }

    chatContainer() {
        return document.querySelector("#leaflow-amber-chat-container")
    }
    showChatButton() {
        return document.querySelector("#leaflow-amber-show-chat")
    }
    chatMessageContainer() {
        return document.querySelector("#leaflow-amber-chat-messages")
    }
    sendButton() {
        return document.querySelector("#leaflow-amber-send-button")
    }
    clearButton() {
        return document.querySelector("#leaflow-amber-clear-button")
    }
    input() {
        return document.querySelector("#leaflow-amber-message-input")
    }
    callingState() {
        return document.querySelector("#leaflow-amber-calling")
    }

    setCalling(name, success = true) {
        if (!name) {
            this.callingState().innerHTML = ""
        } else {
            if (!success) {
                this.callingState().innerHTML = "无法调用此工具"
            } else {
                this.callingState().innerHTML = "正在调用 " + name
            }
        }
    }

    init() {
        const cssContainer = document.createElement("style")
        cssContainer.innerHTML = this.base_css
        document.head.appendChild(cssContainer)

        const baseContainer = document.createElement("div")
        baseContainer.innerHTML = this.getHtml()
        document.body.appendChild(baseContainer)

        const showChatButton = this.showChatButton();
        const hideChatButton = this.hideChatButton();
        const sendButton = this.sendButton();
        // const clearButton = this.clearButton()
        const input = this.input();

        // set name
        if (this.assistant_name) {
            document.querySelector("#leaflow-amber-assistant-name").innerHTML = this.assistant_name
        }


        sendButton.addEventListener("click", () => {
            this.sendMessage()
        });

        input.addEventListener("keydown", (event) => {
            if (event.key === "Enter") {
                this.sendMessage()
            }
        });

        this.addAssistantMessage(this.welcome_message)


        // 监听显示按钮点击事件
        showChatButton.addEventListener('click', () => {
            this.getChatId()
            this.syncMessage()
            this.show()
        });

        // 监听关闭按钮点击事件
        hideChatButton.addEventListener('click', () => {
            this.hide()
        });

        // 清除按钮
        // clearButton.addEventListener("click", () => {
        //     this.clearMessage()
        // })
    }

    toggleChatVisibility() {
        const amberContainer = this.amberContainer()

        if (amberContainer.style.display === 'none') {
            this.show()
        } else {
            this.hide()
        }
    }

    show() {
        const amberContainer = this.amberContainer()
        const showChatButton = this.showChatButton()
        amberContainer.style.display = 'block';
        showChatButton.style.display = 'none';

        const postId = this.getPostId()

        if (postId) {
            this.sendMessage("解读文章(PostId"+postId+")")
        }
    }

    hide() {
        const amberContainer = this.amberContainer()
        const showChatButton = this.showChatButton()

        amberContainer.style.display = 'none';
        showChatButton.style.display = 'flex';
    }

    isOpen() {
        return this.amberContainer().style.display === 'block'
    }

    amberConfig() {
        return {
            server_url: "https://amber-api.leaflow.cn/api/v1"
        }
    }

    async sendMessage(message_override) {
        if (this.processing) {
            return
        }

        let message = this.input().value

        if (!message_override) {
            if (message === "") {
                return
            }

            this.input().value = ""
        } else {
            message = message_override
        }

        if (message === "/reload") {
            window.location.reload()
            return
        } else if (message === "/clear") {
            this.clearMessage();
            return
        } else if (message === "/reset") {
            // 清除 localStorage
            let needClear = ['leaflow_amber_chat_id', 'leaflow_amber_guest_id']

            for (let i = 0; i < needClear.length; i++) {
                localStorage.removeItem(needClear[i])
            }


            if (this.after_reset_message && this.after_reset_message !== "") {
                this.addAssistantMessage(this.after_reset_message)
            }

            this.chat_id = undefined;
            this.guest_id = undefined;

            this.getGuestId();
            this.getChatId();

            return


        }

        const addMessage = () => {
            this.addHumanMessage(message, true)
        }

        fetch(this.amberConfig().server_url + "/chat_public/" + await this.getChatId() + '/messages', {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                assistant_token: this.assistant_token,
                guest_id: this.getGuestId(),
                message: message
            })
        }).then(res => {
            res.json().then(data => {
                if (data.success) {
                    this.processing = true

                    addMessage()

                    this.stream(data.data.stream_id)

                    return data.data.stream_id

                } else {
                    if (res.status === 409) {
                        addMessage()
                        this.input().value = ""


                        this.stream(data.data.stream_id)

                        return data.data.stream_id
                    } else {
                        this.processing = false

                        console.error(data)
                        alert(data.error)


                        if (this.error_message && this.error_message !== "") {
                            this.addAssistantMessage(this.error_message)
                        }
                    }

                    return ""
                }
            }).catch(err => {
                this.processing = false
                console.error(err)
                alert("发送失败")
            })
        })

    }


    async stream(stream_id) {
        if (stream_id === "" || stream_id === undefined) {
            console.error("stream_id is required")
            return
        }

        const url = this.amberConfig().server_url + "/stream/" + stream_id;

        const evtSource = new EventSource(url);

        let messageElement
        let message = ""

        const chatMessageContainer = this.chatMessageContainer()



        let added = false

        evtSource.addEventListener("data", (e) => {
            // 检测滚动条是否在 chatMessageContainer 最底下，如果在，则滚动
            if (chatMessageContainer.scrollTop + chatMessageContainer.clientHeight >= chatMessageContainer.scrollHeight) {
                chatMessageContainer.scrollTop = chatMessageContainer.scrollHeight;
            }

            const data = JSON.parse(e.data);

            switch (data.state) {
                case "tool_calling":
                    this.setCalling(data.tool_call_message.tool_name + " 中的 " + data.tool_call_message.function_name)
                    break;
                case "tool_response":
                    setTimeout(() => {
                        this.setCalling()
                    }, 300);
                    break;
                case "tool_failed":

                    this.setCalling(data.tool_response_message.tool_name + " 中的 " + data.tool_response_message.function_name, false)

                    setTimeout(() => {
                        this.setCalling()
                    }, 300);
                    break;
                case "chunk":
                    if (!added) {
                        messageElement = this.addAssistantMessage()
                        added = true
                    }

                    message += data.content

                    messageElement.innerHTML = markdown.toHTML(message);

                    chatMessageContainer.scrollTop = chatMessageContainer.scrollHeight;

                    break;
            }
        });

        evtSource.addEventListener("close", () => {
            this.processing = false;
            evtSource.close();
        });

    }


    getGuestId() {
        if (this.guest_id !== undefined) {
            return this.guest_id;
        }

        const key = "leaflow_amber_guest_id"

        let guest_id = localStorage.getItem(key)

        if (!guest_id) {
            // regenerate random string
            guest_id = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        }

        localStorage.setItem(key, guest_id);
        this.guest_id = guest_id;

        return guest_id;
    }

    async getChatId() {
        const key = "leaflow_amber_chat_id"

        let chat_id = localStorage.getItem(key)

        if (!chat_id || chat_id === "undefined") {

            const name = new Date().toLocaleDateString() + ' 时 的对话'

            const r = {
                "assistant_token": this.assistant_token,
                "guest_id": this.getGuestId(),
                "name": name
            }


            await fetch(this.amberConfig().server_url + "/chat_public", {
                method: "POST",
                body: JSON.stringify(r),
                headers: {
                    "Content-Type": "application/json"
                }
            }).then(res => {
                res.json().then(data => {
                    if (data.success) {
                        chat_id = data.data.id
                        localStorage.setItem(key, chat_id);
                        this.chat_id = chat_id;

                        return chat_id
                    } else {
                        console.error(data)
                        alert(data.error)
                        return null
                    }
                })
            })
        }

        return chat_id;
    }
    async syncMessage() {
        if (!this.chat_id) {
            let chat_id = await this.getChatId()
            if (!chat_id) {
                return
            }

            this.chat_id = chat_id
        }

        if (this.synced) {
            return
        }

        this.setCalling("同步消息")


        const q = new URLSearchParams({
            assistant_token: this.assistant_token,
            guest_id: this.getGuestId(),
        })


        fetch(this.amberConfig().server_url + "/chat_public/" + await this.getChatId() + '/messages?' + q.toString(), {
            method: "GET",
            headers: {
                "Content-Type": "application/json"
            }
        }).then(res => {
            // if 403
            if (res.status === 403) {
                this.setCalling("正在重置会话")
                // 清除 localStorage
                let needClear = ['leaflow_amber_chat_id', 'leaflow_amber_guest_id']

                for (let i = 0; i < needClear.length; i++) {
                    localStorage.removeItem(needClear[i])
                }


                if (this.after_reset_message && this.after_reset_message !== "") {
                    this.addAssistantMessage(this.after_reset_message)
                }

                this.chat_id = undefined;
                this.guest_id = undefined;

                this.getGuestId();
                this.getChatId();
                this.setCalling()

                return
            }

            res.json().then(data => {
                if (data.success) {
                    data.data.forEach(item => {
                        if (item.role === "user") {
                            this.addHumanMessage(item.content, true)
                        } else if (item.role == 'assistant') {
                            this.addAssistantMessage(item.content, true)
                        }
                    });

                    this.synced = true

                    this.chatMessageContainer().scrollTop = this.chatMessageContainer().scrollHeight;

                } else {
                    console.error(data)
                    alert(data.error)
                }
            })
        }).finally(() => {
            this.setCalling()

        })
    }

    async clearMessage() {
        this.setCalling("清除消息")
        fetch(this.amberConfig().server_url + "/chat_public/" + await this.getChatId() + '/clear', {
            method: "POST",
            body: JSON.stringify({
                assistant_token: this.assistant_token,
                guest_id: this.getGuestId(),
            }),
            headers: {
                "Content-Type": "application/json"
            }
        }).then(() => {
            if (this.message_cleared && this.message_cleared !== "") {
                this.addAssistantMessage(this.message_cleared)
            }

            this.clearLocalMessages()
        }).catch(() => {
            console.error(data)
            alert(data.error)
        }).finally(() => {
            this.setCalling()
        })
    }

    clearLocalMessages() {
        this.chatMessageContainer().innerHTML = ""
    }

    addAssistantMessage(content = "", renderMarkdown = false) {
        if (renderMarkdown) {
            content = markdown.toHTML(content)
        }

        const html = `<div class="leaflow-amber-chat-bubble leaflow-amber-chat-bubble-left"><div class="leaflow-amber-chat-content">${content}</div></div>`

        const element = document.createElement("div")
        element.classList.add("leaflow-amber-chat-bubble-wrapper-left")
        element.innerHTML += html
        this.chatMessageContainer().appendChild(element)
        return element.querySelector('.leaflow-amber-chat-content')
    }

    addHumanMessage(content = "", renderMarkdown = false) {
        if (renderMarkdown) {
            content = markdown.toHTML(content)
        }
        const html = `<div class="leaflow-amber-chat-bubble leaflow-amber-chat-bubble-right"><div class="leaflow-amber-chat-content">${content}</div></div>`
        const element = document.createElement("div")
        element.classList.add("leaflow-amber-chat-bubble-wrapper-right")
        element.innerHTML += html
        this.chatMessageContainer().appendChild(element)
        return element.querySelector('.leaflow-amber-chat-content')
    }

    getPostId() {
        // 获取 attr 为 data-amber-post-id 的 div
        let postId = document.querySelector('[data-amber-post-id]')

        if (postId == null) {
            return null
        }

        return postId.getAttribute('data-amber-post-id');
    }

    //  下面的代码是用于自定义属性
    base_css = `.leaflow-amber-chat-container {
        display: flex;
        flex-direction: column;
        max-width: 80vw;
        min-height: 40vh;
        max-height: 90vh;
        overflow-y: auto;
        margin: 0;
        padding: 20px;
        background-color: #f5f5f5;
        box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 1000;
        border-radius: 10px;
        width: 50vh;
    }
    
    .leaflow-amber-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 10px;
    }
    
    .leaflow-amber-header h2 {
        margin: 0;
        font-size: 1.2em; /* 减小字体大小 */
    }
    
    .leaflow-amber-header .leaflow-amber-header-title {
        flex-grow: 1; /* 让标题占据可用空间 */
    }
    
    .leaflow-amber-header .leaflow-amber-header-close {
        background: none;
        border: none;
        cursor: pointer;
        font-size: 1.2em;
    }
    
    #leaflow-amber-chat-messages {
        flex-grow: 1; /* 让消息区域自适应剩余空间 */
        overflow-y: auto; /* 消息过多时可以滚动 */
    }
    
    .leaflow-amber-chat-bubble-wrapper-left,
    .leaflow-amber-chat-bubble-wrapper-right {
        display: flex;
        align-items: center;
        margin-bottom: 10px; /* 减小间距 */
        width: 100%; /* 占据整个宽度 */
    }
    
    .leaflow-amber-chat-bubble-wrapper-left {
        justify-content: flex-start; /* 左对齐 */
    }
    
    .leaflow-amber-chat-bubble-wrapper-right {
        justify-content: flex-end; /* 右对齐 */
    }
    
    .leaflow-amber-chat-bubble {
        display: inline-block; /* 改为内联块，使宽度自动适应内容 */
        background-color: #e0e0e0;
        border-radius: 10px;
        padding: 0px 12px; /* 减小内边距 */
        position: relative;
        max-width: 80%; /* 设置最大宽度 */
        word-wrap: break-word; /* 自动换行 */
        font-size: 0.9em; /* 减小字体大小 */
    }
    
    .leaflow-amber-chat-bubble * {
        margin: 0;
    }
    
    .leaflow-amber-chat-bubble-left {
        background-color: white;
        text-align: left; /* 左对齐 */
    }
    
    .leaflow-amber-chat-bubble-left * {
        color: black;
    }
    
    .leaflow-amber-chat-bubble-right {
        background-color: #409eff;
        text-align: right; /* 右对齐 */
        margin-right: 5px;
    }
    
    .leaflow-amber-chat-bubble-right * {
        color: white;
    }
    
    .leaflow-amber-input-container {
        display: flex;
        align-items: center;
        margin-top: 10px;
    }
    
    #leaflow-amber-message-input {
        flex-grow: 1;
        padding: 10px;
        border: 1px solid #ccc;
        border-radius: 5px;
        margin-right: 5px; /* 减小输入框与按钮之间的间距 */
    }
    
    #leaflow-amber-send-button {
        padding: 10px 20px;
        background-color: #409eff;
        color: white;
        border: none;
        border-radius: 5px;
        cursor: pointer;
    }

    #leaflow-amber-clear-button {
        padding: 10px 20px;
        background-color: #ff4040;
        color: white;
        border: none;
        border-radius: 5px;
        cursor: pointer;
    }
    
    #leaflow-amber-show-chat {
        position: fixed;
        bottom: 20px; /* 距离底部的距离 */
        right: 20px; /* 距离右侧的距离 */
        z-index: 1001; /* 确保按钮始终位于聊天窗口之上 */
        padding: 10px;
        background-color: #409eff;
        color: white;
        border: none;
        border-radius: 50%; /* 设置为圆形 */
        cursor: pointer;
        outline: none;
    }
    
    .leaflow-amber-show-chat-button {
        width: 50px; /* 设置宽度 */
        height: 50px; /* 设置高度 */
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 24px;
    }

    .leaflow-amber-footer {
        margin-top: 10px;
        text-align: center;
    }
    .leaflow-amber-chat-bubble p {
        margin: 0;
        padding: 5px;
    }
    
    /* 媒体查询以适应暗色模式 */
    @media (prefers-color-scheme: dark) {
    .leaflow-amber-chat-container {
        background-color: #333;
        box-shadow: 0 2px 5px rgba(255,255,255,0.1);
        color: white
    }

    .leaflow-amber-header .leaflow-amber-header-close {
        color: #ccc;
        outline: none;
    }

    .leaflow-amber-chat-bubble-left, .leaflow-amber-chat-bubble-right {
        background-color: #494949;
    }
    
    .leaflow-amber-chat-bubble-left *, .leaflow-amber-chat-bubble-right * {
        color: white;
    }
    
    #leaflow-amber-message-input {
        background-color: #444;
        color: #fff;
        border-color: #666;
        outline: none;
    }

    #leaflow-amber-send-button {
        background-color: #64b5f6;
    }

    #leaflow-amber-clear-button {
        background-color: #ff5252;
    }

    .leaflow-amber-footer a{
        color: white
    }
    #leaflow-amber-assistant-name {
        color: white
    }
    
}
`
    getHtml() {
        return `
<button id="leaflow-amber-show-chat" class="${this.button_css}"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-chat-dots" viewBox="0 0 16 16">
  <path d="M5 8a1 1 0 1 1-2 0 1 1 0 0 1 2 0m4 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0m3 1a1 1 0 1 0 0-2 1 1 0 0 0 0 2"/>
  <path d="m2.165 15.803.02-.004c1.83-.363 2.948-.842 3.468-1.105A9 9 0 0 0 8 15c4.418 0 8-3.134 8-7s-3.582-7-8-7-8 3.134-8 7c0 1.76.743 3.37 1.97 4.6a10.4 10.4 0 0 1-.524 2.318l-.003.011a11 11 0 0 1-.244.637c-.079.186.074.394.273.362a22 22 0 0 0 .693-.125m.8-3.108a1 1 0 0 0-.287-.801C1.618 10.83 1 9.468 1 8c0-3.192 3.004-6 7-6s7 2.808 7 6-3.004 6-7 6a8 8 0 0 1-2.088-.272 1 1 0 0 0-.711.074c-.387.196-1.24.57-2.634.893a11 11 0 0 0 .398-2"/>
</svg></button>
    <div id="leaflow-amber-chat" style="display: none;">
        <div class="leaflow-amber-chat-container" id="leaflow-amber-chat-container">
            <div class="leaflow-amber-header">
                <div class="leaflow-amber-header-title">
                    <h2 id="leaflow-amber-assistant-name">助理</h2>
                </div>
                <button class="leaflow-amber-header-close" id="leaflow-amber-hide-chat"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-x-lg" viewBox="0 0 16 16">
  <path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8z"/>
</svg></button>
            </div>
            <div id="leaflow-amber-chat-messages">
                
               
            </div>
            <div>
                <small id="leaflow-amber-calling"></small>
            </div>
            <div class="leaflow-amber-input-container">
                <input type="text" id="leaflow-amber-message-input" placeholder="输入消息...">
                <button id="leaflow-amber-send-button">发送</button>
            </div>
            <div class="leaflow-amber-footer">
                <small>Powered by <a href="https://amber.leaflow.cn" target="_blank">Leaflow Amber</a></small>
            </div>
        </div>
    </div>`
    }
}


// if window.markdown is not exists
if (typeof window.markdown == "undefined") {
    // Embed markdown https://github.com/evilstreak/markdown-js
    !function (a) { function b() { return "Markdown.mk_block( " + uneval(this.toString()) + ", " + uneval(this.trailing) + ", " + uneval(this.lineNumber) + " )" } function c() { var a = require("util"); return "Markdown.mk_block( " + a.inspect(this.toString()) + ", " + a.inspect(this.trailing) + ", " + a.inspect(this.lineNumber) + " )" } function d(a) { for (var b = 0, c = -1; -1 !== (c = a.indexOf("\n", c + 1));)b++; return b } function e(a) { return a.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;") } function f(a) { if ("string" == typeof a) return e(a); var b = a.shift(), c = {}, d = []; for (!a.length || "object" != typeof a[0] || a[0] instanceof Array || (c = a.shift()); a.length;)d.push(f(a.shift())); var g = ""; for (var h in c) g += " " + h + '="' + e(c[h]) + '"'; return "img" === b || "br" === b || "hr" === b ? "<" + b + g + "/>" : "<" + b + g + ">" + d.join("") + "</" + b + ">" } function g(a, b, c) { var d; c = c || {}; var e = a.slice(0); "function" == typeof c.preprocessTreeNode && (e = c.preprocessTreeNode(e, b)); var f = o(e); if (f) { e[1] = {}; for (d in f) e[1][d] = f[d]; f = e[1] } if ("string" == typeof e) return e; switch (e[0]) { case "header": e[0] = "h" + e[1].level, delete e[1].level; break; case "bulletlist": e[0] = "ul"; break; case "numberlist": e[0] = "ol"; break; case "listitem": e[0] = "li"; break; case "para": e[0] = "p"; break; case "markdown": e[0] = "html", f && delete f.references; break; case "code_block": e[0] = "pre", d = f ? 2 : 1; var h = ["code"]; h.push.apply(h, e.splice(d, e.length - d)), e[d] = h; break; case "inlinecode": e[0] = "code"; break; case "img": e[1].src = e[1].href, delete e[1].href; break; case "linebreak": e[0] = "br"; break; case "link": e[0] = "a"; break; case "link_ref": e[0] = "a"; var i = b[f.ref]; if (!i) return f.original; delete f.ref, f.href = i.href, i.title && (f.title = i.title), delete f.original; break; case "img_ref": e[0] = "img"; var i = b[f.ref]; if (!i) return f.original; delete f.ref, f.src = i.href, i.title && (f.title = i.title), delete f.original }if (d = 1, f) { for (var j in e[1]) { d = 2; break } 1 === d && e.splice(d, 1) } for (; d < e.length; ++d)e[d] = g(e[d], b, c); return e } function h(a) { for (var b = o(a) ? 2 : 1; b < a.length;)"string" == typeof a[b] ? b + 1 < a.length && "string" == typeof a[b + 1] ? a[b] += a.splice(b + 1, 1)[0] : ++b : (h(a[b]), ++b) } function i(a, b) { function c(a) { this.len_after = a, this.name = "close_" + b } var d = a + "_state", e = "strong" === a ? "em_state" : "strong_state"; return function (f) { if (this[d][0] === b) return this[d].shift(), [f.length, new c(f.length - b.length)]; var g = this[e].slice(), h = this[d].slice(); this[d].unshift(b); var i = this.processInline(f.substr(b.length)), j = i[i.length - 1]; if (this[d].shift(), j instanceof c) { i.pop(); var k = f.length - j.len_after; return [k, [a].concat(i)] } return this[e] = g, this[d] = h, [b.length, b] } } function j(a) { for (var b = a.split(""), c = [""], d = !1; b.length;) { var e = b.shift(); switch (e) { case " ": d ? c[c.length - 1] += e : c.push(""); break; case "'": case '"': d = !d; break; case "\\": e = b.shift(); default: c[c.length - 1] += e } } return c } var k = {}; k.mk_block = function (a, d, e) { 1 === arguments.length && (d = "\n\n"); var f = new String(a); return f.trailing = d, f.inspect = c, f.toSource = b, void 0 !== e && (f.lineNumber = e), f }; var l = k.isArray = Array.isArray || function (a) { return "[object Array]" === Object.prototype.toString.call(a) }; k.forEach = Array.prototype.forEach ? function (a, b, c) { return a.forEach(b, c) } : function (a, b, c) { for (var d = 0; d < a.length; d++)b.call(c || a, a[d], d, a) }, k.isEmpty = function (a) { for (var b in a) if (hasOwnProperty.call(a, b)) return !1; return !0 }, k.extract_attr = function (a) { return l(a) && a.length > 1 && "object" == typeof a[1] && !l(a[1]) ? a[1] : void 0 }; var m = function (a) { switch (typeof a) { case "undefined": this.dialect = m.dialects.Gruber; break; case "object": this.dialect = a; break; default: if (!(a in m.dialects)) throw new Error("Unknown Markdown dialect '" + String(a) + "'"); this.dialect = m.dialects[a] }this.em_state = [], this.strong_state = [], this.debug_indent = "" }; m.dialects = {}; var n = m.mk_block = k.mk_block, l = k.isArray; m.parse = function (a, b) { var c = new m(b); return c.toTree(a) }, m.prototype.split_blocks = function (a) { a = a.replace(/(\r\n|\n|\r)/g, "\n"); var b, c = /([\s\S]+?)($|\n#|\n(?:\s*\n|$)+)/g, e = [], f = 1; for (null !== (b = /^(\s*\n)/.exec(a)) && (f += d(b[0]), c.lastIndex = b[0].length); null !== (b = c.exec(a));)"\n#" === b[2] && (b[2] = "\n", c.lastIndex--), e.push(n(b[1], b[2], f)), f += d(b[0]); return e }, m.prototype.processBlock = function (a, b) { var c = this.dialect.block, d = c.__order__; if ("__call__" in c) return c.__call__.call(this, a, b); for (var e = 0; e < d.length; e++) { var f = c[d[e]].call(this, a, b); if (f) return (!l(f) || f.length > 0 && !l(f[0])) && this.debug(d[e], "didn't return a proper array"), f } return [] }, m.prototype.processInline = function (a) { return this.dialect.inline.__call__.call(this, String(a)) }, m.prototype.toTree = function (a, b) { var c = a instanceof Array ? a : this.split_blocks(a), d = this.tree; try { for (this.tree = b || this.tree || ["markdown"]; c.length;) { var e = this.processBlock(c.shift(), c); e.length && this.tree.push.apply(this.tree, e) } return this.tree } finally { b && (this.tree = d) } }, m.prototype.debug = function () { var a = Array.prototype.slice.call(arguments); a.unshift(this.debug_indent), "undefined" != typeof print && print.apply(print, a), "undefined" != typeof console && "undefined" != typeof console.log && console.log.apply(null, a) }, m.prototype.loop_re_over_block = function (a, b, c) { for (var d, e = b.valueOf(); e.length && null !== (d = a.exec(e));)e = e.substr(d[0].length), c.call(this, d); return e }, m.buildBlockOrder = function (a) { var b = []; for (var c in a) "__order__" !== c && "__call__" !== c && b.push(c); a.__order__ = b }, m.buildInlinePatterns = function (a) { var b = []; for (var c in a) if (!c.match(/^__.*__$/)) { var d = c.replace(/([\\.*+?|()\[\]{}])/g, "\\$1").replace(/\n/, "\\n"); b.push(1 === c.length ? d : "(?:" + d + ")") } b = b.join("|"), a.__patterns__ = b; var e = a.__call__; a.__call__ = function (a, c) { return void 0 !== c ? e.call(this, a, c) : e.call(this, a, b) } }; var o = k.extract_attr; m.renderJsonML = function (a, b) { b = b || {}, b.root = b.root || !1; var c = []; if (b.root) c.push(f(a)); else for (a.shift(), !a.length || "object" != typeof a[0] || a[0] instanceof Array || a.shift(); a.length;)c.push(f(a.shift())); return c.join("\n\n") }, m.toHTMLTree = function (a, b, c) { "string" == typeof a && (a = this.parse(a, b)); var d = o(a), e = {}; d && d.references && (e = d.references); var f = g(a, e, c); return h(f), f }, m.toHTML = function (a, b, c) { var d = this.toHTMLTree(a, b, c); return this.renderJsonML(d) }; var p = {}; p.inline_until_char = function (a, b) { for (var c = 0, d = []; ;) { if (a.charAt(c) === b) return c++, [c, d]; if (c >= a.length) return null; var e = this.dialect.inline.__oneElement__.call(this, a.substr(c)); c += e[0], d.push.apply(d, e.slice(1)) } }, p.subclassDialect = function (a) { function b() { } function c() { } return b.prototype = a.block, c.prototype = a.inline, { block: new b, inline: new c } }; var q = k.forEach, o = k.extract_attr, n = k.mk_block, r = k.isEmpty, s = p.inline_until_char, t = { block: { atxHeader: function (a, b) { var c = a.match(/^(#{1,6})\s*(.*?)\s*#*\s*(?:\n|$)/); if (!c) return void 0; var d = ["header", { level: c[1].length }]; return Array.prototype.push.apply(d, this.processInline(c[2])), c[0].length < a.length && b.unshift(n(a.substr(c[0].length), a.trailing, a.lineNumber + 2)), [d] }, setextHeader: function (a, b) { var c = a.match(/^(.*)\n([-=])\2\2+(?:\n|$)/); if (!c) return void 0; var d = "=" === c[2] ? 1 : 2, e = ["header", { level: d }, c[1]]; return c[0].length < a.length && b.unshift(n(a.substr(c[0].length), a.trailing, a.lineNumber + 2)), [e] }, code: function (a, b) { var c = [], d = /^(?: {0,3}\t| {4})(.*)\n?/; if (!a.match(d)) return void 0; a: for (; ;) { var e = this.loop_re_over_block(d, a.valueOf(), function (a) { c.push(a[1]) }); if (e.length) { b.unshift(n(e, a.trailing)); break a } if (!b.length) break a; if (!b[0].match(d)) break a; c.push(a.trailing.replace(/[^\n]/g, "").substring(2)), a = b.shift() } return [["code_block", c.join("\n")]] }, horizRule: function (a, b) { var c = a.match(/^(?:([\s\S]*?)\n)?[ \t]*([-_*])(?:[ \t]*\2){2,}[ \t]*(?:\n([\s\S]*))?$/); if (!c) return void 0; var d = [["hr"]]; if (c[1]) { var e = n(c[1], "", a.lineNumber); d.unshift.apply(d, this.toTree(e, [])) } return c[3] && b.unshift(n(c[3], a.trailing, a.lineNumber + 1)), d }, lists: function () { function a(a) { return new RegExp("(?:^(" + i + "{0," + a + "} {0,3})(" + f + ")\\s+)|" + "(^" + i + "{0," + (a - 1) + "}[ ]{0,4})") } function b(a) { return a.replace(/ {0,3}\t/g, "    ") } function c(a, b, c, d) { if (b) return a.push(["para"].concat(c)), void 0; var e = a[a.length - 1] instanceof Array && "para" === a[a.length - 1][0] ? a[a.length - 1] : a; d && a.length > 1 && c.unshift(d); for (var f = 0; f < c.length; f++) { var g = c[f], h = "string" == typeof g; h && e.length > 1 && "string" == typeof e[e.length - 1] ? e[e.length - 1] += g : e.push(g) } } function d(a, b) { for (var c = new RegExp("^(" + i + "{" + a + "}.*?\\n?)*$"), d = new RegExp("^" + i + "{" + a + "}", "gm"), e = []; b.length > 0 && c.exec(b[0]);) { var f = b.shift(), g = f.replace(d, ""); e.push(n(g, f.trailing, f.lineNumber)) } return e } function e(a, b, c) { var d = a.list, e = d[d.length - 1]; if (!(e[1] instanceof Array && "para" === e[1][0])) if (b + 1 === c.length) e.push(["para"].concat(e.splice(1, e.length - 1))); else { var f = e.pop(); e.push(["para"].concat(e.splice(1, e.length - 1)), f) } } var f = "[*+-]|\\d+\\.", g = /[*+-]/, h = new RegExp("^( {0,3})(" + f + ")[ 	]+"), i = "(?: {0,3}\\t| {4})"; return function (f, i) { function j(a) { var b = g.exec(a[2]) ? ["bulletlist"] : ["numberlist"]; return n.push({ list: b, indent: a[1] }), b } var k = f.match(h); if (!k) return void 0; for (var l, m, n = [], o = j(k), p = !1, r = [n[0].list]; ;) { for (var s = f.split(/(?=\n)/), t = "", u = "", v = 0; v < s.length; v++) { u = ""; var w = s[v].replace(/^\n/, function (a) { return u = a, "" }), x = a(n.length); if (k = w.match(x), void 0 !== k[1]) { t.length && (c(l, p, this.processInline(t), u), p = !1, t = ""), k[1] = b(k[1]); var y = Math.floor(k[1].length / 4) + 1; if (y > n.length) o = j(k), l.push(o), l = o[1] = ["listitem"]; else { var z = !1; for (m = 0; m < n.length; m++)if (n[m].indent === k[1]) { o = n[m].list, n.splice(m + 1, n.length - (m + 1)), z = !0; break } z || (y++, y <= n.length ? (n.splice(y, n.length - y), o = n[y - 1].list) : (o = j(k), l.push(o))), l = ["listitem"], o.push(l) } u = "" } w.length > k[0].length && (t += u + w.substr(k[0].length)) } t.length && (c(l, p, this.processInline(t), u), p = !1, t = ""); var A = d(n.length, i); A.length > 0 && (q(n, e, this), l.push.apply(l, this.toTree(A, []))); var B = i[0] && i[0].valueOf() || ""; if (!B.match(h) && !B.match(/^ /)) break; f = i.shift(); var C = this.dialect.block.horizRule(f, i); if (C) { r.push.apply(r, C); break } q(n, e, this), p = !0 } return r } }(), blockquote: function (a, b) { if (!a.match(/^>/m)) return void 0; var c = []; if (">" !== a[0]) { for (var d = a.split(/\n/), e = [], f = a.lineNumber; d.length && ">" !== d[0][0];)e.push(d.shift()), f++; var g = n(e.join("\n"), "\n", a.lineNumber); c.push.apply(c, this.processBlock(g, [])), a = n(d.join("\n"), a.trailing, f) } for (; b.length && ">" === b[0][0];) { var h = b.shift(); a = n(a + a.trailing + h, h.trailing, a.lineNumber) } var i = a.replace(/^> ?/gm, ""), j = (this.tree, this.toTree(i, ["blockquote"])), k = o(j); return k && k.references && (delete k.references, r(k) && j.splice(1, 1)), c.push(j), c }, referenceDefn: function (a, b) { var c = /^\s*\[(.*?)\]:\s*(\S+)(?:\s+(?:(['"])(.*?)\3|\((.*?)\)))?\n?/; if (!a.match(c)) return void 0; o(this.tree) || this.tree.splice(1, 0, {}); var d = o(this.tree); void 0 === d.references && (d.references = {}); var e = this.loop_re_over_block(c, a, function (a) { a[2] && "<" === a[2][0] && ">" === a[2][a[2].length - 1] && (a[2] = a[2].substring(1, a[2].length - 1)); var b = d.references[a[1].toLowerCase()] = { href: a[2] }; void 0 !== a[4] ? b.title = a[4] : void 0 !== a[5] && (b.title = a[5]) }); return e.length && b.unshift(n(e, a.trailing)), [] }, para: function (a) { return [["para"].concat(this.processInline(a))] } }, inline: { __oneElement__: function (a, b, c) { var d, e; b = b || this.dialect.inline.__patterns__; var f = new RegExp("([\\s\\S]*?)(" + (b.source || b) + ")"); if (d = f.exec(a), !d) return [a.length, a]; if (d[1]) return [d[1].length, d[1]]; var e; return d[2] in this.dialect.inline && (e = this.dialect.inline[d[2]].call(this, a.substr(d.index), d, c || [])), e = e || [d[2].length, d[2]] }, __call__: function (a, b) { function c(a) { "string" == typeof a && "string" == typeof e[e.length - 1] ? e[e.length - 1] += a : e.push(a) } for (var d, e = []; a.length > 0;)d = this.dialect.inline.__oneElement__.call(this, a, b, e), a = a.substr(d.shift()), q(d, c); return e }, "]": function () { }, "}": function () { }, __escape__: /^\\[\\`\*_{}\[\]()#\+.!\-]/, "\\": function (a) { return this.dialect.inline.__escape__.exec(a) ? [2, a.charAt(1)] : [1, "\\"] }, "![": function (a) { var b = a.match(/^!\[(.*?)\][ \t]*\([ \t]*([^")]*?)(?:[ \t]+(["'])(.*?)\3)?[ \t]*\)/); if (b) { b[2] && "<" === b[2][0] && ">" === b[2][b[2].length - 1] && (b[2] = b[2].substring(1, b[2].length - 1)), b[2] = this.dialect.inline.__call__.call(this, b[2], /\\/)[0]; var c = { alt: b[1], href: b[2] || "" }; return void 0 !== b[4] && (c.title = b[4]), [b[0].length, ["img", c]] } return b = a.match(/^!\[(.*?)\][ \t]*\[(.*?)\]/), b ? [b[0].length, ["img_ref", { alt: b[1], ref: b[2].toLowerCase(), original: b[0] }]] : [2, "!["] }, "[": function v(a) { var b = String(a), c = s.call(this, a.substr(1), "]"); if (!c) return [1, "["]; var v, d, e = 1 + c[0], f = c[1]; a = a.substr(e); var g = a.match(/^\s*\([ \t]*([^"']*)(?:[ \t]+(["'])(.*?)\2)?[ \t]*\)/); if (g) { var h = g[1]; if (e += g[0].length, h && "<" === h[0] && ">" === h[h.length - 1] && (h = h.substring(1, h.length - 1)), !g[3]) for (var i = 1, j = 0; j < h.length; j++)switch (h[j]) { case "(": i++; break; case ")": 0 === --i && (e -= h.length - j, h = h.substring(0, j)) }return h = this.dialect.inline.__call__.call(this, h, /\\/)[0], d = { href: h || "" }, void 0 !== g[3] && (d.title = g[3]), v = ["link", d].concat(f), [e, v] } return g = a.match(/^\s*\[(.*?)\]/), g ? (e += g[0].length, d = { ref: (g[1] || String(f)).toLowerCase(), original: b.substr(0, e) }, v = ["link_ref", d].concat(f), [e, v]) : 1 === f.length && "string" == typeof f[0] ? (d = { ref: f[0].toLowerCase(), original: b.substr(0, e) }, v = ["link_ref", d, f[0]], [e, v]) : [1, "["] }, "<": function (a) { var b; return null !== (b = a.match(/^<(?:((https?|ftp|mailto):[^>]+)|(.*?@.*?\.[a-zA-Z]+))>/)) ? b[3] ? [b[0].length, ["link", { href: "mailto:" + b[3] }, b[3]]] : "mailto" === b[2] ? [b[0].length, ["link", { href: b[1] }, b[1].substr("mailto:".length)]] : [b[0].length, ["link", { href: b[1] }, b[1]]] : [1, "<"] }, "`": function (a) { var b = a.match(/(`+)(([\s\S]*?)\1)/); return b && b[2] ? [b[1].length + b[2].length, ["inlinecode", b[3]]] : [1, "`"] }, "  \n": function () { return [3, ["linebreak"]] } } }; t.inline["**"] = i("strong", "**"), t.inline.__ = i("strong", "__"), t.inline["*"] = i("em", "*"), t.inline._ = i("em", "_"), m.dialects.Gruber = t, m.buildBlockOrder(m.dialects.Gruber.block), m.buildInlinePatterns(m.dialects.Gruber.inline); var u = p.subclassDialect(t), o = k.extract_attr, q = k.forEach; u.processMetaHash = function (a) { for (var b = j(a), c = {}, d = 0; d < b.length; ++d)if (/^#/.test(b[d])) c.id = b[d].substring(1); else if (/^\./.test(b[d])) c["class"] = c["class"] ? c["class"] + b[d].replace(/./, " ") : b[d].substring(1); else if (/\=/.test(b[d])) { var e = b[d].split(/\=/); c[e[0]] = e[1] } return c }, u.block.document_meta = function (a) { if (a.lineNumber > 1) return void 0; if (!a.match(/^(?:\w+:.*\n)*\w+:.*$/)) return void 0; o(this.tree) || this.tree.splice(1, 0, {}); var b = a.split(/\n/); for (var c in b) { var d = b[c].match(/(\w+):\s*(.*)$/), e = d[1].toLowerCase(), f = d[2]; this.tree[1][e] = f } return [] }, u.block.block_meta = function (a) { var b = a.match(/(^|\n) {0,3}\{:\s*((?:\\\}|[^\}])*)\s*\}$/); if (!b) return void 0; var c, d = this.dialect.processMetaHash(b[2]); if ("" === b[1]) { var e = this.tree[this.tree.length - 1]; if (c = o(e), "string" == typeof e) return void 0; c || (c = {}, e.splice(1, 0, c)); for (var f in d) c[f] = d[f]; return [] } var g = a.replace(/\n.*$/, ""), h = this.processBlock(g, []); c = o(h[0]), c || (c = {}, h[0].splice(1, 0, c)); for (var f in d) c[f] = d[f]; return h }, u.block.definition_list = function (a, b) { var c, d, e = /^((?:[^\s:].*\n)+):\s+([\s\S]+)$/, f = ["dl"]; if (!(d = a.match(e))) return void 0; for (var g = [a]; b.length && e.exec(b[0]);)g.push(b.shift()); for (var h = 0; h < g.length; ++h) { var d = g[h].match(e), i = d[1].replace(/\n$/, "").split(/\n/), j = d[2].split(/\n:\s+/); for (c = 0; c < i.length; ++c)f.push(["dt", i[c]]); for (c = 0; c < j.length; ++c)f.push(["dd"].concat(this.processInline(j[c].replace(/(\n)\s+/, "$1")))) } return [f] }, u.block.table = function w(a) { var b, c, d = function (a, b) { b = b || "\\s", b.match(/^[\\|\[\]{}?*.+^$]$/) && (b = "\\" + b); for (var c, d = [], e = new RegExp("^((?:\\\\.|[^\\\\" + b + "])*)" + b + "(.*)"); c = a.match(e);)d.push(c[1]), a = c[2]; return d.push(a), d }, e = /^ {0,3}\|(.+)\n {0,3}\|\s*([\-:]+[\-| :]*)\n((?:\s*\|.*(?:\n|$))*)(?=\n|$)/, f = /^ {0,3}(\S(?:\\.|[^\\|])*\|.*)\n {0,3}([\-:]+\s*\|[\-| :]*)\n((?:(?:\\.|[^\\|])*\|.*(?:\n|$))*)(?=\n|$)/; if (c = a.match(e)) c[3] = c[3].replace(/^\s*\|/gm, ""); else if (!(c = a.match(f))) return void 0; var w = ["table", ["thead", ["tr"]], ["tbody"]]; c[2] = c[2].replace(/\|\s*$/, "").split("|"); var g = []; for (q(c[2], function (a) { a.match(/^\s*-+:\s*$/) ? g.push({ align: "right" }) : a.match(/^\s*:-+\s*$/) ? g.push({ align: "left" }) : a.match(/^\s*:-+:\s*$/) ? g.push({ align: "center" }) : g.push({}) }), c[1] = d(c[1].replace(/\|\s*$/, ""), "|"), b = 0; b < c[1].length; b++)w[1][1].push(["th", g[b] || {}].concat(this.processInline(c[1][b].trim()))); return q(c[3].replace(/\|\s*$/gm, "").split("\n"), function (a) { var c = ["tr"]; for (a = d(a, "|"), b = 0; b < a.length; b++)c.push(["td", g[b] || {}].concat(this.processInline(a[b].trim()))); w[2].push(c) }, this), [w] }, u.inline["{:"] = function (a, b, c) { if (!c.length) return [2, "{:"]; var d = c[c.length - 1]; if ("string" == typeof d) return [2, "{:"]; var e = a.match(/^\{:\s*((?:\\\}|[^\}])*)\s*\}/); if (!e) return [2, "{:"]; var f = this.dialect.processMetaHash(e[1]), g = o(d); g || (g = {}, d.splice(1, 0, g)); for (var h in f) g[h] = f[h]; return [e[0].length, ""] }, m.dialects.Maruku = u, m.dialects.Maruku.inline.__escape__ = /^\\[\\`\*_{}\[\]()#\+.!\-|:]/, m.buildBlockOrder(m.dialects.Maruku.block), m.buildInlinePatterns(m.dialects.Maruku.inline), a.Markdown = m, a.parse = m.parse, a.toHTML = m.toHTML, a.toHTMLTree = m.toHTMLTree, a.renderJsonML = m.renderJsonML }(function () { return window.markdown = {}, window.markdown }());
}
