const jsdom = require('jsdom');
const {JSDOM} = jsdom;

const dom = new JSDOM(`<!DOCTYPE html>`, {url: 'http://localhost/'});

global.document = dom.window.document;
global.Document = dom.window.Document;
global.HTMLDocument = dom.window.HTMLDocument;
global.navigator = dom.window.navigator;
global.window = dom.window;
global['self'] = dom.window;

global.Element = dom.window.Element;
global.HTMLBodyElement = dom.window.HTMLBodyElement;
global.HTMLElement = dom.window.HTMLElement;
global.MutationObserver = dom.window.MutationObserver;
global.Node = dom.window.Node;
global.ShadowRoot = dom.window.ShadowRoot;
global.SVGElement = dom.window.SVGElement;
global.Text = dom.window.Text;
global.Comment = dom.window.Comment;
global.getComputedStyle = dom.window.getComputedStyle;
