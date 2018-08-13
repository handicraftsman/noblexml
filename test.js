const nxml = require('./index');
const b = new nxml.XMLBuilder();

b
  .start_document()
  .write_object({
    name: 'hello',
    attrs: {'hello': 'world'},
    children: [
      'asdf',
      {
        name: 'foo',
        attrs: {'foo': 'bar'},
        children: [],
      },
    ],
  })
  .start_element('foo')
    .start_element('bar')
      .write_cdata('Hello, holy ]]> world!')
    .end_element()
    .start_element('baz')
      .start_element('quux')
  .end_document()
console.log(b.dump());