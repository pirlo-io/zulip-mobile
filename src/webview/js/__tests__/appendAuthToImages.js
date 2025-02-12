/** @jest-environment jsdom-global */
// @flow strict-local

import appendAuthToImages from '../appendAuthToImages';
import type { Auth } from '../../../types';

describe('appendAuthToImages', () => {
  // URL will be on-realm
  const realm = 'https://realm.example.com';
  global.jsdom.reconfigure({ url: `${realm}/` });

  const auth: Auth = {
    realm,
    apiKey: 'hMV41eMjVmr6dajvnyOA', // arbitrary random string
    email: 'rosencrantz+guildenstern@zulipchat.com',
  };

  const rewrite = (src: string): { input: string, before: string, after: string } => {
    const img = document.createElement('img');
    img.setAttribute('src', src);
    const before = img.src;
    appendAuthToImages(auth, img);
    const after = img.src;
    return { input: src, before, after };
  };

  // URL prefixes. May have a final slash.
  const prefixes = {
    relative: '',
    'root-relative': '/',
    absolute: realm,
    'absolute off-realm': 'https://example.org',
  };

  // URL suffixes. May have an initial slash.
  const suffixes = {
    empty: '',
    'known endpoint': 'avatar/example',
    'known endpoint plus': 'avatar/example?size=large',
    'other endpoint': 'placekitten?w=640&w=480',
  };

  Object.keys(prefixes).forEach(pType => {
    const prefix: string = prefixes[pType];
    describe(`${pType} URL`, () => {
      Object.keys(suffixes).forEach(sType => {
        const suffix: string = suffixes[sType];
        if (!prefix && !suffix) {
          return;
        }
        describe(`+ ${sType} path`, () => {
          const divider =
            prefix && !prefix.endsWith('/') && suffix && !suffix.startsWith('/') ? '/' : '';
          const url = `${prefix}${divider}${suffix}`;
          const { before, after } = rewrite(url);

          if (pType.includes('absolute')) {
            test('... is not relativized', () => {
              expect(before).toStartWith(url);
              expect(after).toStartWith(url);
            });
          } else {
            test('... gains a prefix when relativized', () => {
              expect(before).not.toStartWith(url);
              expect(after).not.toStartWith(url);
            });
          }

          if (pType.includes('off-realm')) {
            test('... yields an off-realm URL', () => {
              expect(new URL(before).hostname).not.toBe('realm.example.com');
            });
          } else {
            test('... yields an on-realm URL', () => {
              expect(new URL(before).hostname).toBe('realm.example.com');
            });
          }

          if (sType.includes('known endpoint') && !pType.includes('off-realm')) {
            test('... has `api_key` added', () => {
              expect(after).toContain(auth.apiKey);
              expect(new URL(after).searchParams.getAll('api_key')).toEqual([auth.apiKey]);
            });
          } else {
            test('... does not have `api_key` added', () => {
              expect(after).not.toContain(auth.apiKey);
              expect(new URL(after).searchParams.getAll('api_key')).toEqual([]);
            });
          }
        });
      });
    });
  });

  /* Specific concrete examples.

    Formally redundant with the preceding tests, but useful for calibrating
    those against human expectations.
  */

  test('on-realm known endpoint is modified', () => {
    const { input, before, after } = rewrite('https://realm.example.com/thumbnail?nyancat.gif');
    expect(before).toBe(input);
    expect(after).not.toBe(input);
  });

  test('on-realm unknown endpoint is left alone', () => {
    const { input, before, after } = rewrite('https://realm.example.com/placekitten?h=300&w=200');
    expect(before).toBe(input);
    expect(after).toBe(input);
  });

  test('absolute non-realm url is left alone', () => {
    const { input, before, after } = rewrite('https://cataas.com/cat/computer');
    expect(before).toBe(input);
    expect(after).toBe(input);
  });
});
