const EOF = Symbol('EOF')
const css = require('css');
const rules = []

let currentToken = null;
let currentAttribute = null;
const stack = [{ type: 'document', children: [] }]
let currentTextNode = null

function emit (token) {
    let top = stack[stack.length - 1]
    console.log(token)

    if (token.type === 'startTag') {
        let element = {
            type: 'element',
            children: [],
            attributes: [],
        }

        element.tagName = token.tagName

        for (let key in token) {
            if (key !== 'tagName' && key !== 'type') {
                element.attributes.push({
                    name: key,
                    value: token[key]
                })
            }
        }

        computeCSS(element)

        top.children.push(element)
        element.parent = top

        if (!token.isSelfClosing) {
            stack.push(element)
        }

        currentTextNode = null
    } else if (token.type === 'endTag') {
        if (top.tagName === token.tagName) {
            if (top.tagName === 'style') {
                addCSSRules(top.children[0].content)
            }
            stack.pop()
        } else {
            throw new Error(`错误标签：${top.tagName}, ${token.tagName}`)
        }
        currentTextNode = null
    } else if (token.type === 'text') {
        if (currentTextNode === null) {
            currentTextNode = {
                type: 'text',
                content: '',
            }
            top.children.push(currentTextNode)
        }
        currentTextNode.content += token.content
    }
}

function addCSSRules (text) {
    let ast = css.parse(text)
    rules.push(...ast.stylesheet.rules)
}

function computeCSS (element) {
    let elements = stack.slice().reverse()

    if (!element.computedStyle) {
        element.computedStyle = {}
    }

    for (let rule of rules) {
        for (let selectors of rule.selectors) {
            let selectorParts = selectors.split(' ').reverse()
            if (!match(element, selectorParts[0])) continue

            let matched = false
            let j = 1

            for (let i = 0; i < elements.length; i++) {
                if (match(elements[i], selectorParts[j])) {
                    j++
                }
            }
            if (j >= selectorParts.length)
                matched = true


            if (matched) {
                let computedStyle = element.computedStyle
                for (let declaration of rule.declarations) {
                    let sp = specificity(selectorParts)
                    if (!computedStyle[declaration.property]) {
                        computedStyle[declaration.property] = {}
                        computedStyle[declaration.property].value = declaration.value
                        computedStyle[declaration.property].specificity = sp
                    } else if (compare(computedStyle[declaration.property].specificity, sp) < 0) {
                        computedStyle[declaration.property].value = declaration.value
                        computedStyle[declaration.property].specificity = sp
                    }
                }
                console.log(element.computedStyle)
            }
        }
    }
}

function specificity (selectorParts) {
    let allSelect = []
    for (let selectorPart of selectorParts) {
        allSelect.push(...parseSelect(selectorPart))
    }

    let spArr = new Array(4).fill(0) 
    for (let onSelect of allSelect) {
        if (onSelect.charAt(0) === '.') spArr[2]++
        else if (onSelect.charAt(0) === '#') spArr[1]++
        else spArr[3]++
    }
    return spArr
}

function compare (sp_1, sp_2) {
    for (let i = 0; i < 4; i++) {
        let space = sp_1[i] - sp_2[i]
        if (space < 0) return -1
        else if (space > 0) return 1
    }
    return 0
}

function parseSelect (str) {
    return str.match(/^([^.^#]+)|(\.[^.^#]+)|(\#[^.^#]+)/g) || []
}

function match (element, selector) {
    if (!selector || !element.attributes) return false
    let selectorArr = parseSelect(selector)

    if (!selectorArr.length) return false

    for (let _selector of selectorArr) {
        let thisOk = false
        // id
        if (_selector.charAt(0) === '#') {
            let attr = element.attributes.find(attr => attr.name === 'id')

            if (attr && attr.value === _selector.replace('#', '')) {
                thisOk = true
            }
            //calss
        } else if (_selector.charAt(0) === '.') {
            let attr = element.attributes.find(attr => attr.name === 'class')

            if (attr && attr.value === _selector.replace('.', '')) {
                thisOk = true
            }
            //tagName
        } else {
            if (element.tagName === _selector) {
                thisOk = true
            }
        }
        if (!thisOk) return false
    }
    return true
}

function data (char) {
    if (char === '<') {
        return tagOpen
    } else if (char === EOF) {
        emit({
            type: 'EOF',
        })
        return
    } else {
        emit({
            type: 'text',
            content: char,
        })
        return data
    }
}

function tagOpen (char) {
    if (char === '/') {
        return endTagOpen
    } else if (char.match(/^[a-zA-Z]$/)) {
        currentToken = {
            type: 'startTag',
            tagName: '',
        }
        return tagName(char)
    } else {
    }
}

function endTagOpen (char) {
    if (char.match(/^[a-zA-Z]$/)) {
        currentToken = {
            type: 'endTag',
            tagName: '',
        }
        return tagName(char)
    } else if (char === '>') {
    } else if (char === EOF) {
    } else {
    }
}

function tagName (char) {
    if (char.match(/^[\t\n\f ]$/)) {
        return beforeAttributeName
    } else if (char === '/') {
        return selfClosingStartTag
    } else if (char.match(/^[a-zA-Z]$/)) {
        currentToken.tagName += char
        return tagName
    } else if (char === '>') {
        emit(currentToken)
        return data
    } else {
        return tagName
    }
}

function beforeAttributeName (char) {
    if (char.match(/^[\t\n\f ]$/)) {
        return beforeAttributeName
    } else if (char === '>' || char === '/' || char === EOF) {
        return afterAttributeName(char);
    } else if (char === '=') {
    } else {
        currentAttribute = {
            name: '',
            value: '',
        }
        return attributeName(char)
    }
}

function attributeName (char) {
    if (char.match(/^[\t\n\f ]$/) || char === '/' || char === '>' || char === EOF) {
        return afterAttributeName(char)
    } else if (char === '=') {
        return beforeAttributeValue
    } else if (char === '\u0000') {

    } else if (char === '"' || char === "'" || char === '<') {

    } else {
        currentAttribute.name += char
        return attributeName
    }
}

function beforeAttributeValue (char) {
    if (char.match(/^[\t\n\f ]$/) || char === '/' || char === '>' || char === EOF) {
        return beforeAttributeValue
    } else if (char === '"') {
        return doubleQuotedAttributeValue;
    } else if (char === "'") {
        return singleQuotedAttributeValue;
    } else {
        return UnquotedAttributeValue(char)
    }
}

function doubleQuotedAttributeValue (char) {
    if (char === '"') {
        currentToken[currentAttribute.name] = currentAttribute.value
        return beforeAttributeName
    } else if (char === '\u0000') {

    } else if (char === EOF) {

    } else {
        currentAttribute.value += char
        return doubleQuotedAttributeValue
    }
}

function singleQuotedAttributeValue (char) {
    if (char === "'") {
        currentToken[currentAttribute.name] = currentAttribute.value
        return beforeAttributeName
    } else if (char === '\u0000') {

    } else if (char === EOF) {

    } else {
        currentAttribute.value += char
        return singleQuotedAttributeValue
    }
}

function UnquotedAttributeValue (char) {
    if (char.match(/^[\t\n\f ]$/)) {
        currentToken[currentAttribute.name] = currentAttribute.value
        return beforeAttributeName
    } else if (char === '/') {
        currentToken[currentAttribute.name] = currentAttribute.value
        return selfClosingStartTag
    } else if (char === '>') {
        currentToken[currentAttribute.name] = currentAttribute.value
        emit(currentToken)
        return data
    } else if (char === '\u0000') {

    } else if (char === EOF) {

    } else {
        currentAttribute.value += char
        return UnquotedAttributeValue
    }
}

function afterAttributeName (char) {
    if (char.match(/^[\t\n\f ]$/)) {
        return afterAttributeName;
    } else if (char === '/') {
        return selfClosingStartTag
    } else if (char === '=') {
        return beforeAttributeValue
    } else if (char === '>') {
        currentToken[currentAttribute.name] = currentAttribute.value
        emit(currentToken)
        return data
    } else if (char === EOF) {

    } else {
        currentToken[currentAttribute.name] = currentAttribute.value
        currentAttribute = {
            naem: '',
            value: '',
        }
        return attributeName(char)
    }

}

function selfClosingStartTag (char) {
    if (char === '>') {
        currentToken.isSelfClosing = true
        emit(currentToken)
        return data
    } else if (char === EOF) {

    } else {

    }
}

module.exports.parseHtml = function parseHTML (html) {
    console.log(html)
    let state = data;
    for (let char of html) {
        state = state(char)
    }
    state = state(EOF)
    console.log(stack[0])
}