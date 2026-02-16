interface Props {
    inverted?: boolean;
}

export const Arrow = ({ inverted }: Props) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        css={{
            transform: inverted ? "rotate(180deg)" : undefined,
        }}
    >
        <polyline points="9 18 15 12 9 6" />
    </svg>
);
