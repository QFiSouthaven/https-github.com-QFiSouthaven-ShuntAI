// components/settings/Settings.tsx
import React from 'react';
import { useSettings } from '../../context/SettingsContext';
import TabFooter from '../common/TabFooter';

const Settings: React.FC = () => {
    const { settings, updateSetting } = useSettings();

    const handleSettingChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        if (type === 'checkbox') {
            const { checked } = e.target as HTMLInputElement;
            updateSetting(name as keyof typeof settings, checked);
        } else {
            updateSetting(name as keyof typeof settings, value);
        }
    };

    return (
        <div className="flex flex-col h-full">
            <div className="p-4 md:p-6 space-y-6 flex-grow overflow-y-auto">
                <div className="max-w-2xl mx-auto">
                    <h2 className="text-xl font-semibold text-white mb-6">Global Settings</h2>

                    <div className="space-y-6">
                        <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-6">
                            <h3 className="font-semibold text-lg text-gray-200 mb-4">Appearance</h3>
                            <div className="space-y-4">
                                <div>
                                    <label htmlFor="backgroundColor" className="block text-sm font-medium text-gray-400">Background Color</label>
                                    <input
                                        type="color"
                                        id="backgroundColor"
                                        name="backgroundColor"
                                        value={settings.backgroundColor}
                                        onChange={handleSettingChange}
                                        className="mt-1 w-full h-10 p-1 bg-gray-700 border border-gray-600 rounded-md cursor-pointer"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="miaFontColor" className="block text-sm font-medium text-gray-400">Mia's Font Color</label>
                                    <input
                                        type="color"
                                        id="miaFontColor"
                                        name="miaFontColor"
                                        value={settings.miaFontColor}
                                        onChange={handleSettingChange}
                                        className="mt-1 w-full h-10 p-1 bg-gray-700 border border-gray-600 rounded-md cursor-pointer"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="backgroundImage" className="block text-sm font-medium text-gray-400">Background Image URL</label>
                                    <input
                                        type="text"
                                        id="backgroundImage"
                                        name="backgroundImage"
                                        value={settings.backgroundImage}
                                        onChange={handleSettingChange}
                                        placeholder="Enter image URL or leave blank for none"
                                        className="mt-1 w-full p-2 bg-gray-900 border border-gray-600 rounded-md text-gray-200"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-6">
                             <h3 className="font-semibold text-lg text-gray-200 mb-4">Preferences</h3>
                             <div className="space-y-4">
                                <label className="flex items-center justify-between cursor-pointer">
                                    <span className="text-gray-300">Enable Animations</span>
                                    <input
                                        type="checkbox"
                                        name="animationsEnabled"
                                        checked={settings.animationsEnabled}
                                        onChange={handleSettingChange}
                                        className="h-4 w-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
                                    />
                                </label>
                                <label className="flex items-center justify-between cursor-pointer">
                                    <span className="text-gray-300">Enable Audio Feedback</span>
                                    <input
                                        type="checkbox"
                                        name="audioFeedbackEnabled"
                                        checked={settings.audioFeedbackEnabled}
                                        onChange={handleSettingChange}
                                        className="h-4 w-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
                                    />
                                </label>
                             </div>
                        </div>
                    </div>
                </div>
            </div>
            <TabFooter />
        </div>
    );
};

export default Settings;
