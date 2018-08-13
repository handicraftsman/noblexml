const EventEmitter = require('events');
const sjs = require('sax');

class XMLBuilder {
  constructor(writer) {
    this.buf    = '';
    this.writer = writer || ((data) => {
      this.buf += data;
    });
    this.tag_done = true;
    this.to_close = [];
  }
  
  dump() {
    let b = this.buf;
    this.buf = '';
    return b;
  }

  start_document() {
    this.writer('<?xml version="1.0" encoding="UTF-8"?>');
    return this;
  }

  end_document() {
    if (!this.tag_done) {
      this.writer('>');
      this.tag_done = true;
    }
    while (this.to_close.length > 0) {
      this.end_element();
    }
    return this;
  }

  start_element(name) {
    if (!this.tag_done) {
      this.writer('>');
      this.tag_done = true;
    }
    this.writer(`<${name.replace(/[<>]/g, '')} `);
    this.to_close.push(name);
    this.tag_done = false;
    return this;
  }

  end_element() {
    let name = this.to_close.pop();
    if (!this.tag_done) {
      this.writer('>');
      this.tag_done = true;
    }
    this.writer(`</${name.replace(/[<>]/g, '')}>`);
    return this;
  }

  write_attribute(name, value) {
    if (this.tag_done) {
      throw 'cannot write to finished tag';
    }
    this.writer(`${name.replace(/[<>]/g, '')}="${value.replace(/["]/g, '')}" `);
    return this;
  }

  write_text(text) {
    if (!this.tag_done) {
      this.writer('>');
      this.tag_done = true;
    }
    this.writer(text.replace(/[<]/g, '&lt').replace(/[>]/g, '&gt'));
    return this;
  }

  write_cdata(text) {
    if (!this.tag_done) {
      this.writer('>');
      this.tag_done = true;
    }
    this.writer(`<![CDATA[${text.replace(/\]\]\>/g, ']]]]><![CDATA[>')}]]>`);
    return this;
  }

  write_object(obj) {
    this.start_element(obj.name);
    for (let k in obj.attrs) {
      let v = obj.attrs[k];
      this.write_attribute(k, v);
    }
    for (let cid in obj.children) {
      let c = obj.children[cid];
      if (typeof c == 'string') {
        this.write_text(c);
      } else {
        this.write_object(c);
      }
    }
    this.end_element();
    return this;
  }
}

class XMLObjectGetter {
  constructor(endElementName) {
    this.parser = sjs.parser(false);
    this.endElementName = endElementName;
    this.nesting = [];
    this.stream = [];
    this.onelem = function() {}
    this.onend = function() {}
    let rep = (t) => t.replace(/\s+/g, ' ').replace(/\r+/g, ' ').replace(/\n+/g, ' ');
    this.parser.onerror = (err) => {
      if (!err.message.includes('Unexpected')) {
        throw err;
      }
    }
    let ontext = (t) => {
      if (this.nesting.length <= 0) {
        let last = this.stream[this.stream.length-1];
        if (typeof last == 'string') {
          last += t;
        } else {
          this.stream.push(rep(t));
        }
      } else {
        this.nesting[this.nesting.length-1].text += rep(t);
      }
    }
    this.parser.ontext = ontext;
    this.parser.oncdata = ontext;
    this.parser.onopentag = (node) => {
      if (node.name.toLowerCase() != endElementName) {
        let tag = {
          name: node.name.toLowerCase(),
          attrs: {},
          children: [],
          text: ''
        };
        for (let k in node.attributes) {
          tag.attrs[k] = node.attributes[k].toLowerCase();
        }
        this.nesting.push(tag);
      }
    }
    this.parser.onclosetag = (name) => {
      name = name.toLowerCase();
      if (this.nesting.length <= 0) {
        if (name == this.endElementName) {
          this.parser.close();
          return;
        } else {
          throw 'unable to close non-existing tag';
        }
      } else if (this.nesting[this.nesting.length-1].name != name) {
        throw 'unable to close wrong tag';
      }
      if (this.nesting.length > 1) {
        this.nesting[this.nesting.length-2].children.push(this.nesting[this.nesting.length-1]);
      }
      let last = this.nesting[this.nesting.length-1];
      if (last) {
        last.text = rep(last.text);
      }
      if (this.nesting.length == 1) {
        this.stream.push(this.nesting[this.nesting.length-1]);
        this.nesting.pop();
        this.onelem();
      } else {
        this.nesting.pop();
      }
    }
    this.parser.onend = () => {
      this.onend();
    }
  }

  write(data) {
    this.parser.write(data);
  }
}

module.exports = {
  XMLBuilder,
  XMLObjectGetter
}