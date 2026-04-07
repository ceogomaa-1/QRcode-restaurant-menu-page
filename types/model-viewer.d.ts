declare namespace JSX {
  interface IntrinsicElements {
    'model-viewer': React.DetailedHTMLProps<
      React.HTMLAttributes<HTMLElement> & {
        src?: string
        alt?: string
        ar?: boolean | ''
        'ar-modes'?: string
        'camera-controls'?: boolean | ''
        'auto-rotate'?: boolean | ''
        'shadow-intensity'?: string
        style?: React.CSSProperties
        slot?: string
      },
      HTMLElement
    >
  }
}
