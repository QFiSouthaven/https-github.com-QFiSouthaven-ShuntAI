// components/ui_builder/UIBuilder.tsx
import React, { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { CodeIcon, XMarkIcon } from '../icons';

// --- TYPES ---
type ComponentType = 'div' | 'h1' | 'p' | 'button' | 'img' | 'input';
interface UIComponent {
  id: string;
  type: ComponentType;
  props: {
    style: React.CSSProperties;
    text?: string;
    src?: string;
    alt?: string;
    placeholder?: string;
  };
}

// --- CONFIGURATION ---
const COMPONENT_LIBRARY: { type: ComponentType, name: string }[] = [
    { type: 'div', name: 'Container' },
    { type: 'h1', name: 'Heading 1' },
    { type: 'p', name: 'Paragraph' },
    { type: 'button', name: 'Button' },
    { type: 'img', name: 'Image' },
    { type: 'input', name: 'Text Input' },
];

const PROPS_CONFIG: Record<ComponentType, (keyof UIComponent['props'])[]> = {
    div: ['style'],
    h1: ['text', 'style'],
    p: ['text', 'style'],
    button: ['text', 'style'],
    img: ['src', 'alt', 'style'],
    input: ['placeholder', 'style'],
};

const STYLE_PROPS: (keyof React.CSSProperties)[] = [
    'width', 'height', 'backgroundColor', 'color', 'fontSize', 'padding', 'margin', 'borderRadius', 'border'
];

// --- SUB-COMPONENTS ---

const ComponentItem: React.FC<{ type: ComponentType, name: string }> = ({ type, name }) => {
    const handleDragStart = (e: React.DragEvent) => {
        e.dataTransfer.setData('componentType', type);
    };
    return (
        <div
            draggable
            onDragStart={handleDragStart}
            className="p-2 border border-gray-600 rounded-md bg-gray-700/50 cursor-grab hover:bg-gray-700"
        >
            {name}
        </div>
    );
};

const PropInput: React.FC<{ label: string, value: any, onChange: (value: any) => void }> = ({ label, value, onChange }) => (
    <div>
        <label className="text-xs text-gray-400 capitalize">{label}</label>
        <input
            type={label.toLowerCase().includes('color') ? 'color' : 'text'}
            value={value || ''}
            onChange={e => onChange(e.target.value)}
            className="w-full mt-1 p-1 bg-gray-900/80 border border-gray-600 rounded text-sm"
        />
    </div>
);

const CodeModal: React.FC<{ code: string; onClose: () => void }> = ({ code, onClose }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
        <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            <header className="flex items-center justify-between p-3 border-b border-gray-700">
                <h3 className="font-semibold text-gray-200">Generated React Component</h3>
                <button onClick={onClose} className="text-gray-400 hover:text-white"><XMarkIcon className="w-5 h-5" /></button>
            </header>
            <main className="p-4 overflow-auto">
                <pre className="text-sm text-cyan-300 bg-black/30 p-4 rounded-md font-mono whitespace-pre-wrap">
                    <code>{code}</code>
                </pre>
            </main>
        </div>
    </div>
);

// --- MAIN COMPONENT ---

const UIBuilder: React.FC = () => {
    const [components, setComponents] = useState<UIComponent[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [isCodeVisible, setIsCodeVisible] = useState(false);

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const type = e.dataTransfer.getData('componentType') as ComponentType;
        const canvasRect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const newComponent: UIComponent = {
            id: uuidv4(),
            type,
            props: {
                text: `New ${type}`,
                src: 'https://via.placeholder.com/150',
                alt: 'Placeholder image',
                placeholder: 'Enter text...',
                style: {
                    position: 'absolute',
                    top: `${e.clientY - canvasRect.top}px`,
                    left: `${e.clientX - canvasRect.left}px`,
                    padding: '8px',
                    minWidth: '50px',
                    minHeight: '30px',
                },
            },
        };
        setComponents(prev => [...prev, newComponent]);
    };

    const updateComponent = (id: string, newProps: Partial<UIComponent['props']>) => {
        setComponents(prev => prev.map(c => c.id === id ? { ...c, props: { ...c.props, ...newProps } } : c));
    };

    const updateStyle = (id: string, newStyle: Partial<React.CSSProperties>) => {
        setComponents(prev => prev.map(c => c.id === id ? { ...c, props: { ...c.props, style: { ...c.props.style, ...newStyle } } } : c));
    };

    const selectedComponent = components.find(c => c.id === selectedId);

    const generateCode = () => {
        const componentCode = components.map(comp => {
            const styleString = JSON.stringify(comp.props.style);
            let propsString = `style={${styleString}}`;
            if(comp.type === 'img') {
                return `        <img key="${comp.id}" src="${comp.props.src}" alt="${comp.props.alt}" ${propsString} />`;
            }
            if(comp.type === 'input') {
                return `        <input key="${comp.id}" placeholder="${comp.props.placeholder}" ${propsString} />`;
            }
            return `        <${comp.type} key="${comp.id}" ${propsString}>${comp.props.text || ''}</${comp.type}>`;
        }).join('\n');

        return `import React from 'react';

const GeneratedComponent = () => {
    return (
        <div style={{ position: 'relative', width: '100%', height: '100vh', backgroundColor: '#e5e5e5' }}>
${componentCode}
        </div>
    );
};

export default GeneratedComponent;
`;
    };

    return (
        <div className="flex h-full text-white bg-gray-800/30">
            {isCodeVisible && <CodeModal code={generateCode()} onClose={() => setIsCodeVisible(false)} />}
            
            {/* Left Panel: Component Library */}
            <aside className="w-56 bg-gray-800/50 p-4 border-r border-gray-700/50 flex-shrink-0">
                <h2 className="font-semibold mb-4">Components</h2>
                <div className="space-y-2">
                    {COMPONENT_LIBRARY.map(item => <ComponentItem key={item.type} {...item} />)}
                </div>
            </aside>

            {/* Center Panel: Canvas */}
            <main className="flex-grow p-4 relative" onDragOver={e => e.preventDefault()} onDrop={handleDrop}>
                <div
                    onClick={() => setSelectedId(null)}
                    className="absolute inset-0 bg-gray-700/20"
                    style={{ backgroundImage: 'radial-gradient(#555 1px, transparent 1px)', backgroundSize: '20px 20px' }}
                ></div>
                {/* FIX: Replaced dynamic tag rendering with a type-safe switch statement to resolve JSX namespace and signature errors. */}
                {components.map(comp => {
                    const commonProps = {
                        key: comp.id,
                        style: comp.props.style,
                        onClick: (e: React.MouseEvent) => { e.stopPropagation(); setSelectedId(comp.id); },
                        className: `cursor-pointer ${selectedId === comp.id ? 'outline outline-2 outline-offset-2 outline-cyan-400' : ''}`,
                    };

                    switch (comp.type) {
                        case 'div':
                            return <div {...commonProps}>{comp.props.text}</div>;
                        case 'h1':
                            return <h1 {...commonProps}>{comp.props.text}</h1>;
                        case 'p':
                            return <p {...commonProps}>{comp.props.text}</p>;
                        case 'button':
                            return <button {...commonProps}>{comp.props.text}</button>;
                        case 'img':
                            return <img {...commonProps} src={comp.props.src} alt={comp.props.alt} />;
                        case 'input':
                            return <input {...commonProps} placeholder={comp.props.placeholder} />;
                        default:
                            return null;
                    }
                })}
            </main>

            {/* Right Panel: Properties */}
            <aside className="w-64 bg-gray-800/50 p-4 border-l border-gray-700/50 flex-shrink-0 overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="font-semibold">Properties</h2>
                    <button onClick={() => setIsCodeVisible(true)} className="p-1.5 rounded hover:bg-gray-700"><CodeIcon className="w-5 h-5"/></button>
                </div>
                {selectedComponent ? (
                    <div className="space-y-4">
                        <div className="text-sm">Type: <span className="font-mono bg-gray-700 px-2 py-0.5 rounded">{selectedComponent.type}</span></div>
                        <hr className="border-gray-600"/>
                        <h3 className="font-semibold text-gray-300">Content</h3>
                        <div className="space-y-2">
                           {PROPS_CONFIG[selectedComponent.type].includes('text') && (
                               <PropInput label="Text" value={selectedComponent.props.text} onChange={val => updateComponent(selectedId!, { text: val })} />
                           )}
                           {PROPS_CONFIG[selectedComponent.type].includes('src') && (
                               <PropInput label="Image Source (URL)" value={selectedComponent.props.src} onChange={val => updateComponent(selectedId!, { src: val })} />
                           )}
                           {PROPS_CONFIG[selectedComponent.type].includes('alt') && (
                               <PropInput label="Alt Text" value={selectedComponent.props.alt} onChange={val => updateComponent(selectedId!, { alt: val })} />
                           )}
                           {PROPS_CONFIG[selectedComponent.type].includes('placeholder') && (
                               <PropInput label="Placeholder" value={selectedComponent.props.placeholder} onChange={val => updateComponent(selectedId!, { placeholder: val })} />
                           )}
                        </div>
                         <hr className="border-gray-600"/>
                        <h3 className="font-semibold text-gray-300">Styles</h3>
                        <div className="space-y-2">
                            {STYLE_PROPS.map(prop => (
                                <PropInput
                                    key={prop}
                                    label={prop}
                                    value={selectedComponent.props.style[prop]}
                                    onChange={val => updateStyle(selectedId!, { [prop]: val })}
                                />
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="text-center text-gray-500 pt-10">Select a component to edit its properties.</div>
                )}
            </aside>
        </div>
    );
};

export default UIBuilder;