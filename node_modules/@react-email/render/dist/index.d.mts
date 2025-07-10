import { HtmlToTextOptions } from 'html-to-text';
import { Options as Options$1 } from 'prettier';

type Options = {
    pretty?: boolean;
} & ({
    plainText?: false;
} | {
    plainText?: true;
    /**
     * These are options you can pass down directly to the library we use for
     * converting the rendered email's HTML into plain text.
     *
     * @see https://github.com/html-to-text/node-html-to-text
     */
    htmlToTextOptions?: HtmlToTextOptions;
});

declare const render: (element: React.ReactElement, options?: Options) => Promise<string>;

declare const pretty: (str: string, options?: Options$1) => Promise<string>;

export { Options, pretty, render };
