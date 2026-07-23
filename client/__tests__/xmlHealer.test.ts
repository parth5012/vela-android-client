import { healXmlTags } from '../utils/xmlHealer';

describe('healXmlTags', () => {
  it('should return empty string for empty input', () => {
    expect(healXmlTags('')).toBe('');
  });

  it('should return unchanged text if no XML tags are present', () => {
    expect(healXmlTags('Hello World')).toBe('Hello World');
  });

  it('should return unchanged text if all XML tags are correctly closed', () => {
    expect(healXmlTags('<thought>Some thought</thought><intent>Some intent</intent>')).toBe(
      '<thought>Some thought</thought><intent>Some intent</intent>'
    );
  });

  it('should close a single unclosed thought tag', () => {
    expect(healXmlTags('<thought>Thinking...')).toBe('<thought>Thinking...</thought>');
  });

  it('should close a single unclosed intent tag', () => {
    expect(healXmlTags('<intent>Doing this...')).toBe('<intent>Doing this...</intent>');
  });

  it('should close a single unclosed call tag without input', () => {
    expect(healXmlTags('<call:google_search>')).toBe('<call:google_search></call:google_search>');
  });

  it('should close a single unclosed call tag with double-quoted input', () => {
    expect(healXmlTags('<call:google_search input="react native">')).toBe(
      '<call:google_search input="react native"></call:google_search>'
    );
  });

  it('should close a single unclosed call tag with single-quoted input', () => {
    expect(healXmlTags("<call:google_search input='react native'>")).toBe(
      "<call:google_search input='react native'></call:google_search>"
    );
  });

  it('should close a single unclosed skill tag without input', () => {
    expect(healXmlTags('<skill:web_search>')).toBe('<skill:web_search></skill:web_search>');
  });

  it('should close multiple nested unclosed tags in reverse order', () => {
    expect(healXmlTags('<thought>Let me check<call:search input="react"><intent>searching')).toBe(
      '<thought>Let me check<call:search input="react"><intent>searching</intent></call:search></thought>'
    );
  });

  it('should handle correctly closed tag inside an unclosed tag', () => {
    expect(healXmlTags('<thought>Hello <intent>world</intent> testing')).toBe(
      '<thought>Hello <intent>world</intent> testing</thought>'
    );
  });

  it('should pop matching tags correctly from stack', () => {
    expect(
      healXmlTags('<thought>Test</thought><call:search><intent>Nested</intent>')
    ).toBe(
      '<thought>Test</thought><call:search><intent>Nested</intent></call:search>'
    );
  });

  it('should support tag names containing colons', () => {
    expect(healXmlTags('<call:db:query>Query')).toBe(
      '<call:db:query>Query</call:db:query>'
    );
  });

  it('should not match tag prefixes like </calling> when closing call:tool', () => {
    expect(healXmlTags('<call:tool>text</calling>')).toBe(
      '<call:tool>text</calling></call:tool>'
    );
  });

  it('should handle malformed/invalid tags followed by valid unclosed tags without getting stuck', () => {
    expect(healXmlTags('<cal:tool> <call:tool>content')).toBe(
      '<cal:tool> <call:tool>content</call:tool>'
    );
  });

  it('should handle whitespace variations in attributes', () => {
    expect(healXmlTags('<call:search    input  =  "react"   >')).toBe(
      '<call:search    input  =  "react"   ></call:search>'
    );
  });

  it('should heal nested crossing violations by auto-closing nested tags first', () => {
    expect(healXmlTags('<thought><call:search>text</thought>')).toBe(
      '<thought><call:search>text</call:search></thought>'
    );
  });

  it('should handle escaped quotes inside attributes', () => {
    expect(healXmlTags('<call:search input="react \\"native\\"\">')).toBe(
      '<call:search input="react \\"native\\"\"></call:search>'
    );
  });

  it('should support generic call tags when closed properly', () => {
    expect(healXmlTags('<call>text</call>')).toBe('<call>text</call>');
  });

  it('should heal generic unclosed call tags', () => {
    expect(healXmlTags('<call>text')).toBe('<call>text</call>');
  });

  it('should support generic skill tags when closed properly', () => {
    expect(healXmlTags('<skill>text</skill>')).toBe('<skill>text</skill>');
  });

  it('should heal generic unclosed skill tags', () => {
    expect(healXmlTags('<skill>text')).toBe('<skill>text</skill>');
  });
});
