import React from 'react';

interface MarkdownRendererProps {
  content: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
    // 1. Split by code blocks first to preserve their content
    const parts = content.split(/(```[\s\S]*?```)/g);

    const renderText = (text: string) => {
        // Basic HTML escaping
        let html = text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");

        // Headings
        html = html.replace(/^### (.*$)/gim, '<h3 class="text-xl font-semibold mb-2 mt-4">$1</h3>');
        html = html.replace(/^## (.*$)/gim, '<h2 class="text-2xl font-semibold mb-3 mt-5 border-b border-gray-600 pb-2">$1</h2>');
        html = html.replace(/^# (.*$)/gim, '<h1 class="text-3xl font-bold mb-4 mt-6 border-b-2 border-gray-500 pb-3">$1</h1>');
        
        // Bold
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        
        // Italic
        html = html.replace(/__(.*?)__/g, '<em>$1</em>');
        html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
        // Unordered lists - convert items to <li>
        html = html.replace(/^\* (.*$)/gim, '<li class="ml-4">$1</li>');
        // Wrap consecutive <li> blocks in <ul>.
        html = html.replace(/((?:<li>.*<\/li>\s*(?:\n|$))+)/g, '<ul class="list-disc list-inside space-y-1 my-2">$1</ul>');
    
        // Paragraphs: Wrap lines that aren't already part of a block element.
        const finalHtml = html.split('\n').map(line => {
            if (line.trim() === '' || line.match(/^\s*</)) { 
                return line;
            }
            return `<p class="my-2">${line}</p>`;
        }).join('');
    
        return <div dangerouslySetInnerHTML={{ __html: finalHtml }} />;
    };

    return (
        <div className="prose prose-invert prose-sm max-w-none">
            {parts.map((part, index) => {
                if (!part) return null;
                if (part.startsWith('```') && part.endsWith('```')) {
                    const code = part.slice(3, -3).trim();
                    const languageMatch = code.match(/^[a-z]+\n/);
                    const language = languageMatch ? languageMatch[0].trim() : '';
                    const actualCode = language ? code.substring(code.indexOf('\n') + 1) : code;
                    
                    return (
                        <div key={index} className="bg-black/50 rounded-lg my-4 not-prose">
                            {language && <div className="text-xs text-gray-400 px-4 py-2 border-b border-gray-600/50">{language}</div>}
                            <pre className="p-4 text-sm text-gray-200 overflow-x-auto whitespace-pre-wrap font-mono">
                                <code>{actualCode}</code>
                            </pre>
                        </div>
                    );
                }
                return <div key={index}>{renderText(part)}</div>;
            })}
        </div>
    );
};

export default MarkdownRenderer;