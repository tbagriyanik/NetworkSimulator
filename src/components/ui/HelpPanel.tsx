'use client';

import { useState } from 'react';
import type { GuidedModeStep } from '@/types/ui-ux';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { Button } from './button';
import { Icon } from './icon';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './collapsible';
import { Badge } from './badge';

export interface HelpPanelProps {
    guidedModeEnabled?: boolean;
    onGuidedModeToggle?: (enabled: boolean) => void;
    currentStep?: GuidedModeStep;
    onNextStep?: () => void;
    onPreviousStep?: () => void;
    hintLevel?: number;
    onHintRequest?: (level: number) => void;
    className?: string;
}

/**
 * Help & Guidance Panel Component
 * Provides contextual help, guided mode, and learning resources
 */
export function HelpPanel({
    guidedModeEnabled = false,
    onGuidedModeToggle,
    currentStep,
    onNextStep,
    onPreviousStep,
    hintLevel = 0,
    onHintRequest,
    className = '',
}: HelpPanelProps) {
    const [expandedSection, setExpandedSection] = useState<string | null>('guided-mode');

    const conceptGlossary = [
        {
            term: 'IP Address',
            definition: 'A unique identifier for a device on a network',
            example: '192.168.1.1',
        },
        {
            term: 'Subnet Mask',
            definition: 'Determines which part of an IP address is the network and which is the host',
            example: '255.255.255.0',
        },
        {
            term: 'Gateway',
            definition: 'The device that connects your local network to other networks',
            example: '192.168.1.1',
        },
        {
            term: 'Router',
            definition: 'A device that forwards data packets between networks',
            example: 'Network Router',
        },
        {
            term: 'Switch',
            definition: 'A device that connects devices within the same network',
            example: 'Network Switch',
        },
        {
            term: 'VLAN',
            definition: 'Virtual Local Area Network - logically separates networks',
            example: 'VLAN 10, VLAN 20',
        },
    ];

    const keyboardShortcuts = [
        { key: 'Ctrl+S', action: 'Save configuration' },
        { key: 'Ctrl+Z', action: 'Undo last action' },
        { key: 'Ctrl+Y', action: 'Redo last action' },
        { key: 'Delete', action: 'Delete selected device' },
        { key: 'Escape', action: 'Deselect all' },
        { key: 'F1', action: 'Open help' },
    ];

    const commonTasks = [
        {
            title: 'Add a Device',
            steps: ['Click on a device in the palette', 'Drag it to the canvas', 'Release to place it'],
        },
        {
            title: 'Connect Devices',
            steps: ['Click on a port on the first device', 'Click on a port on the second device', 'Connection is created'],
        },
        {
            title: 'Configure a Device',
            steps: ['Click on a device to select it', 'Open the configuration panel', 'Enter IP address and other settings'],
        },
        {
            title: 'Send a Ping',
            steps: ['Right-click on a device', 'Select "Send Ping"', 'Choose the destination device'],
        },
    ];

    return (
        <Card className={`w-full ${className}`}>
            <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                    <Icon name="help-circle" size={20} />
                    Help & Guidance
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 max-h-96 overflow-y-auto">
                {/* Guided Mode Section */}
                <Collapsible
                    open={expandedSection === 'guided-mode'}
                    onOpenChange={(open) => setExpandedSection(open ? 'guided-mode' : null)}
                >
                    <CollapsibleTrigger asChild>
                        <Button variant="outline" className="w-full justify-between">
                            <span className="flex items-center gap-2">
                                <Icon name="book-open" size={16} />
                                Guided Mode
                            </span>
                            <Icon name={expandedSection === 'guided-mode' ? 'chevron-up' : 'chevron-down'} size={16} />
                        </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-3 pt-3">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold">Enable Guided Mode</span>
                            <Button
                                size="sm"
                                variant={guidedModeEnabled ? 'default' : 'outline'}
                                onClick={() => onGuidedModeToggle?.(!guidedModeEnabled)}
                            >
                                {guidedModeEnabled ? 'Enabled' : 'Disabled'}
                            </Button>
                        </div>

                        {guidedModeEnabled && currentStep && (
                            <div className="space-y-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                                <div className="flex items-center justify-between">
                                    <Badge variant="default">
                                        Step {currentStep.stepNumber} of {currentStep.totalSteps}
                                    </Badge>
                                    <span className="text-xs text-gray-600">
                                        {Math.round((currentStep.stepNumber / currentStep.totalSteps) * 100)}%
                                    </span>
                                </div>

                                <div>
                                    <h4 className="font-semibold text-sm mb-1">{currentStep.title}</h4>
                                    <p className="text-sm text-gray-700">{currentStep.description}</p>
                                </div>

                                {/* Hints */}
                                <div className="space-y-2">
                                    <div className="text-xs font-semibold text-gray-600">Hints:</div>
                                    {[1, 2, 3].map((level) => (
                                        <Button
                                            key={level}
                                            size="sm"
                                            variant={hintLevel >= level ? 'default' : 'outline'}
                                            className="w-full text-xs justify-start"
                                            onClick={() => onHintRequest?.(level)}
                                        >
                                            <Icon name="lightbulb" size={14} className="mr-2" />
                                            Hint Level {level}
                                            {hintLevel >= level && <Icon name="check" size={14} className="ml-auto" />}
                                        </Button>
                                    ))}
                                </div>

                                {/* Hint Display */}
                                {hintLevel > 0 && (
                                    <div className="p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                                        {hintLevel === 1 && currentStep.hints.level1}
                                        {hintLevel === 2 && currentStep.hints.level2}
                                        {hintLevel === 3 && currentStep.hints.level3}
                                    </div>
                                )}

                                {/* Navigation */}
                                <div className="flex gap-2">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={onPreviousStep}
                                        disabled={currentStep.stepNumber === 1}
                                        className="flex-1"
                                    >
                                        <Icon name="chevron-left" size={14} className="mr-1" />
                                        Previous
                                    </Button>
                                    <Button
                                        size="sm"
                                        onClick={onNextStep}
                                        disabled={currentStep.stepNumber === currentStep.totalSteps}
                                        className="flex-1"
                                    >
                                        Next
                                        <Icon name="chevron-right" size={14} className="ml-1" />
                                    </Button>
                                </div>
                            </div>
                        )}
                    </CollapsibleContent>
                </Collapsible>

                {/* Concept Glossary */}
                <Collapsible
                    open={expandedSection === 'glossary'}
                    onOpenChange={(open) => setExpandedSection(open ? 'glossary' : null)}
                >
                    <CollapsibleTrigger asChild>
                        <Button variant="outline" className="w-full justify-between">
                            <span className="flex items-center gap-2">
                                <Icon name="book" size={16} />
                                Concept Glossary
                            </span>
                            <Icon name={expandedSection === 'glossary' ? 'chevron-up' : 'chevron-down'} size={16} />
                        </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-2 pt-3">
                        {conceptGlossary.map((item, index) => (
                            <div key={index} className="p-2 bg-gray-50 rounded border border-gray-200">
                                <div className="font-semibold text-sm text-blue-600">{item.term}</div>
                                <div className="text-xs text-gray-700 mt-1">{item.definition}</div>
                                <div className="text-xs text-gray-500 mt-1 font-mono">Example: {item.example}</div>
                            </div>
                        ))}
                    </CollapsibleContent>
                </Collapsible>

                {/* Common Tasks */}
                <Collapsible
                    open={expandedSection === 'tasks'}
                    onOpenChange={(open) => setExpandedSection(open ? 'tasks' : null)}
                >
                    <CollapsibleTrigger asChild>
                        <Button variant="outline" className="w-full justify-between">
                            <span className="flex items-center gap-2">
                                <Icon name="list-check" size={16} />
                                Common Tasks
                            </span>
                            <Icon name={expandedSection === 'tasks' ? 'chevron-up' : 'chevron-down'} size={16} />
                        </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-3 pt-3">
                        {commonTasks.map((task, index) => (
                            <div key={index} className="p-2 bg-gray-50 rounded border border-gray-200">
                                <div className="font-semibold text-sm mb-2">{task.title}</div>
                                <ol className="text-xs text-gray-700 space-y-1 list-decimal list-inside">
                                    {task.steps.map((step, stepIndex) => (
                                        <li key={stepIndex}>{step}</li>
                                    ))}
                                </ol>
                            </div>
                        ))}
                    </CollapsibleContent>
                </Collapsible>

                {/* Keyboard Shortcuts */}
                <Collapsible
                    open={expandedSection === 'shortcuts'}
                    onOpenChange={(open) => setExpandedSection(open ? 'shortcuts' : null)}
                >
                    <CollapsibleTrigger asChild>
                        <Button variant="outline" className="w-full justify-between">
                            <span className="flex items-center gap-2">
                                <Icon name="keyboard" size={16} />
                                Keyboard Shortcuts
                            </span>
                            <Icon name={expandedSection === 'shortcuts' ? 'chevron-up' : 'chevron-down'} size={16} />
                        </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-2 pt-3">
                        {keyboardShortcuts.map((shortcut, index) => (
                            <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded border border-gray-200">
                                <span className="text-xs text-gray-700">{shortcut.action}</span>
                                <Badge variant="secondary" className="font-mono text-xs">
                                    {shortcut.key}
                                </Badge>
                            </div>
                        ))}
                    </CollapsibleContent>
                </Collapsible>
            </CardContent>
        </Card>
    );
}
