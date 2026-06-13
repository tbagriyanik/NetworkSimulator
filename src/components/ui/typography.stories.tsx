/**
 * Typography System Stories
 * Demonstrates all typography components and their usage
 */

import React from 'react';
import {
    Heading1,
    Heading2,
    Heading3,
    Body,
    Small,
    Caption,
    Monospace,
    Text,
    ResponsiveTypography,
} from './typography';
import { TYPOGRAPHY_SCALE } from '@/constants/ui-ux';

const typographyMeta = {
    title: 'Typography',
    component: Heading1,
};

export default typographyMeta;

/**
 * Typography Scale Overview
 */
export const TypographyScale = () => (
    <div className="space-y-8 p-8">
        <div>
            <Heading1>Heading 1 (32px, Bold)</Heading1>
            <Caption>Used for page titles and main headings</Caption>
        </div>

        <div>
            <Heading2>Heading 2 (24px, Bold)</Heading2>
            <Caption>Used for section titles</Caption>
        </div>

        <div>
            <Heading3>Heading 3 (18px, Semibold)</Heading3>
            <Caption>Used for subsection titles</Caption>
        </div>

        <div>
            <Body>
                Body text (16px, Regular) - This is the main body text used throughout
                the application. It provides clear, readable content for students.
            </Body>
            <Caption>Used for main body text</Caption>
        </div>

        <div>
            <Small>
                Small text (14px, Regular) - Used for secondary text and labels
            </Small>
            <Caption>Used for secondary text and labels</Caption>
        </div>

        <div>
            <Caption>Caption text (12px, Regular) - Used for captions and hints</Caption>
            <Caption>Used for captions, hints, and very small text</Caption>
        </div>

        <div>
            <Monospace>192.168.1.1</Monospace>
            <Caption>Used for code, IP addresses, and technical text</Caption>
        </div>
    </div>
);

/**
 * Heading Components
 */
export const Headings = () => (
    <div className="space-y-4 p-8">
        <Heading1>This is a Heading 1</Heading1>
        <Heading2>This is a Heading 2</Heading2>
        <Heading3>This is a Heading 3</Heading3>
    </div>
);

/**
 * Body Text Components
 */
export const BodyText = () => (
    <div className="space-y-4 p-8 max-w-2xl">
        <Body>
            This is body text. It&apos;s used for the main content of the application. The
            font size is 16px with a line height of 1.5 for optimal readability.
        </Body>
        <Small>
            This is small text. It&apos;s used for secondary information and labels. The
            font size is 14px.
        </Small>
        <Caption>
            This is caption text. It&apos;s used for hints, captions, and very small text.
            The font size is 12px.
        </Caption>
    </div>
);

/**
 * Code and Technical Text
 */
export const CodeText = () => (
    <div className="space-y-4 p-8">
        <div>
            <Body>IP Address:</Body>
            <Monospace>192.168.1.1</Monospace>
        </div>
        <div>
            <Body>MAC Address:</Body>
            <Monospace>00:1A:2B:3C:4D:5E</Monospace>
        </div>
        <div>
            <Body>Device Name:</Body>
            <Monospace>Router-01</Monospace>
        </div>
    </div>
);

/**
 * Text Component with Variants
 */
export const TextVariants = () => (
    <div className="space-y-4 p-8">
        <Text variant="h1">Text with h1 variant</Text>
        <Text variant="h2">Text with h2 variant</Text>
        <Text variant="h3">Text with h3 variant</Text>
        <Text variant="body">Text with body variant</Text>
        <Text variant="small">Text with small variant</Text>
        <Text variant="caption">Text with caption variant</Text>
    </div>
);

/**
 * Responsive Typography
 */
export const ResponsiveText = () => (
    <div className="space-y-4 p-8">
        <ResponsiveTypography
            as="h1"
            mobileSize="h3"
            tabletSize="h2"
            desktopSize="h1"
        >
            This heading is responsive - it changes size based on screen width
        </ResponsiveTypography>
        <ResponsiveTypography
            mobileSize="small"
            tabletSize="body"
            desktopSize="body"
        >
            This text is responsive - it&apos;s smaller on mobile and larger on desktop
        </ResponsiveTypography>
    </div>
);

/**
 * Typography with Custom Styling
 */
export const CustomStyling = () => (
    <div className="space-y-4 p-8">
        <Heading1 className="text-blue-600">Colored Heading</Heading1>
        <Body className="text-gray-600">Colored body text</Body>
        <Small className="font-semibold">Bold small text</Small>
        <Caption className="italic">Italic caption</Caption>
    </div>
);

/**
 * Typography Scale Reference
 */
export const ScaleReference = () => (
    <div className="space-y-8 p-8 bg-gray-50">
        <div>
            <Heading2>Typography Scale Reference</Heading2>
            <Body className="mt-4">
                This page shows all available typography scales and their specifications.
            </Body>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {Object.entries(TYPOGRAPHY_SCALE).map(([key, scale]) => (
                <div key={key} className="bg-white p-4 rounded border">
                    <Heading3 className="capitalize">{key}</Heading3>
                    <div className="mt-2 space-y-1">
                        <Small>Size: {scale.size}px</Small>
                        <Small>Weight: {scale.weight}</Small>
                        <Small>Line Height: {scale.lineHeight}</Small>
                    </div>
                    <div className="mt-4 p-3 bg-gray-100 rounded">
                        <div
                            style={{
                                fontSize: `${scale.size}px`,
                                fontWeight: scale.weight,
                                lineHeight: scale.lineHeight,
                            }}
                        >
                            Sample text in {key}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    </div>
);

/**
 * Real-World Example: Device Configuration Panel
 */
export const RealWorldExample = () => (
    <div className="space-y-4 p-8 max-w-2xl bg-white rounded border">
        <Heading2>Device Configuration</Heading2>

        <div className="space-y-4">
            <div>
                <Body className="font-semibold mb-2">Device Name</Body>
                <Small className="text-gray-600">Enter a descriptive name for this device</Small>
            </div>

            <div>
                <Body className="font-semibold mb-2">IP Address</Body>
                <Monospace>192.168.1.1</Monospace>
                <Caption className="mt-1">IPv4 address in dotted decimal notation</Caption>
            </div>

            <div>
                <Body className="font-semibold mb-2">Subnet Mask</Body>
                <Monospace>255.255.255.0</Monospace>
                <Caption className="mt-1">Defines the network portion of the IP address</Caption>
            </div>

            <div>
                <Body className="font-semibold mb-2">Gateway</Body>
                <Monospace>192.168.1.254</Monospace>
                <Caption className="mt-1">Default gateway for routing traffic</Caption>
            </div>

            <div className="pt-4 border-t">
                <Small className="text-gray-600">
                    All fields are required. Hover over each field for more information.
                </Small>
            </div>
        </div>
    </div>
);
