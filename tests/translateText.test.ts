// Copyright 2022 DeepL SE (https://www.deepl.com)
// Use of this source code is governed by an MIT
// license that can be found in the LICENSE file.

import * as deepl from 'deepl-node';

import {exampleText, makeTranslator, withMockServer, withRealServer,} from './core';

describe('translate text', () => {
    it('should translate a single text', async () => {
        const translator = makeTranslator();
        const result = await translator.translateText(exampleText.en, null, 'de');
        expect(result.text).toBe(exampleText.de);
        expect(result.detectedSourceLang).toBe('en');
    });

    it('should translate an array of texts', async () => {
        const translator = makeTranslator();
        const result = await translator.translateText([exampleText.fr, exampleText.en], null, 'de');
        expect(result[0].text).toBe(exampleText.de);
        expect(result[0].detectedSourceLang).toBe('fr');
        expect(result[1].text).toBe(exampleText.de);
        expect(result[1].detectedSourceLang).toBe('en');
    });

    it('should accept language codes in any case', async () => {
        const translator = makeTranslator();
        let result = await translator.translateText(exampleText.en, 'en', 'de');
        expect(result.text).toBe(exampleText.de);
        expect(result.detectedSourceLang).toBe('en');

        result = await translator.translateText(exampleText.en, 'en', 'de');
        expect(result.text).toBe(exampleText.de);
        expect(result.detectedSourceLang).toBe('en');

        const sourceLangEn = <deepl.SourceLanguageCode>'eN'; // Type cast to silence type-checks
        const targetLangDe = <deepl.TargetLanguageCode>'De'; // Type cast to silence type-checks
        result = await translator.translateText(exampleText.en, sourceLangEn, targetLangDe);
        expect(result.text).toBe(exampleText.de);
        expect(result.detectedSourceLang).toBe('en');
    });

    it('should reject deprecated target codes', async () => {
        const translator = makeTranslator();

        const targetLangEn = <deepl.TargetLanguageCode>'en'; // Type cast to silence type-checks
        await expect(translator.translateText(exampleText.de, null, targetLangEn)).rejects.toThrow(/deprecated/);

        const targetLangPt = <deepl.TargetLanguageCode>'pt'; // Type cast to silence type-checks
        await expect(translator.translateText(exampleText.de, null, targetLangPt)).rejects.toThrow(/deprecated/);
    });

    it('should reject invalid language codes', async () => {
        const translator = makeTranslator();

        const sourceLangInvalid = <deepl.SourceLanguageCode>'xx'; // Type cast to silence type-checks
        await expect(translator.translateText(exampleText.de, sourceLangInvalid, 'en-US')).rejects.toThrow('source_lang');

        const targetLangInvalid = <deepl.TargetLanguageCode>'xx'; // Type cast to silence type-checks
        await expect(translator.translateText(exampleText.de, null, targetLangInvalid)).rejects.toThrow('target_lang');
    });

    it('should reject empty texts', async () => {
        const translator = makeTranslator();
        await expect(translator.translateText('', null, 'de')).rejects.toThrow('texts parameter');
        await expect(translator.translateText([''], null, 'de')).rejects.toThrow('texts parameter');
    });

    withMockServer('should retry 429s with delay', async () => {
        const translator = makeTranslator({mockServer429ResponseTimes: 2});
        const timeBefore = Date.now();
        await translator.translateText(exampleText.en, null, 'de');
        const timeAfter = Date.now();
        // Elapsed time should be at least 1 second
        expect(timeAfter - timeBefore).toBeGreaterThan(1000);
    });

    withRealServer('should translate with formality', async () => {
        const translator = makeTranslator();
        const input = 'How are you?';
        const formal = 'Wie geht es Ihnen?';
        const informal = 'Wie geht es dir?';
        expect((await translator.translateText(input, null, 'de')).text).toBe(formal);
        expect((await translator.translateText(input, null, 'de', {formality: 'less'})).text).toBe(informal);
        expect((await translator.translateText(input, null, 'de', {formality: 'default'})).text).toBe(formal);
        expect((await translator.translateText(input, null, 'de', {formality: 'more'})).text).toBe(formal);

        const formalityLess = <deepl.Formality>'LESS'; // Type cast to silence type-checks
        expect((await translator.translateText(input, null, 'de', {formality: formalityLess})).text).toBe(informal);

        const formalityDefault = <deepl.Formality>'DEFAULT'; // Type cast to silence type-checks
        expect((await translator.translateText(input, null, 'de', {formality: formalityDefault})).text).toBe(formal);

        const formalityMore = <deepl.Formality>'MORE'; // Type cast to silence type-checks
        expect((await translator.translateText(input, null, 'de', {formality: formalityMore})).text).toBe(formal);
    });

    it('should reject invalid formality', async () => {
        const translator = makeTranslator();
        const invalidFormality = <deepl.Formality>'invalid'; // Type cast to silence type-checks
        await expect(translator.translateText('Test', null, 'de', {formality: invalidFormality})).rejects.toThrow('formality');
    });

    it('should translate with split sentences', async () => {
        const translator = makeTranslator();
        const input = 'The firm said it had been\nconducting an internal investigation.';
        await translator.translateText(input, null, 'de', {splitSentences: 'off'});
        await translator.translateText(input, null, 'de', {splitSentences: 'on'});
        await translator.translateText(input, null, 'de', {splitSentences: 'nonewlines'});
        await translator.translateText(input, null, 'de', {splitSentences: 'default'});

        // Invalid sentence splitting modes are ignored
        const invalidSplitSentences = <deepl.SentenceSplittingMode>'invalid'; // Type cast to silence type-checks
        await expect(translator.translateText(input, null, 'de', {splitSentences: invalidSplitSentences})).rejects.toThrow('split_sentences');
    });

    it('should translate with preserve formatting', async () => {
        const translator = makeTranslator();
        const input = exampleText.en;
        await translator.translateText(input, null, 'de', {preserveFormatting: false});
        await translator.translateText(input, null, 'de', {preserveFormatting: true});
    });

    withRealServer('should translate using specified tags', async () => {
        const translator = makeTranslator();
        const text = '\
            <document>\n\
                <meta>\n\
                    <title>A document\'s title</title>\n\
                </meta>\n\
                <content>\n\
                    <par>\n\
                        <span>This is a sentence split</span><span>across two &lt;span&gt; tags that should be treated as one.</span>\n\
                    </par>\n\
                    <par>Here is a sentence. Followed by a second one.</par>\n\
                    <raw>This sentence will not be translated.</raw>\n\
                </content>\n\
            </document>';
        const result = await translator.translateText(text, null, 'de', {
            tagHandling: 'xml',
            outlineDetection: false,
            nonSplittingTags: 'span',
            splittingTags: ['title', 'par'],
            ignoreTags: ['raw'],
        });
        expect(result.text).toContain('<raw>This sentence will not be translated.</raw>');
        expect(result.text).toContain('<title>Der Titel');
    });

});
