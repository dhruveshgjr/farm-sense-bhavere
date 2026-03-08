import { Component, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';

interface Props {
  section: string;
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    console.error(`[ErrorBoundary:${this.props.section}]`, error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-card rounded-lg shadow-sm p-6 text-center">
          <p className="text-sm text-muted-foreground mb-2">
            {this.props.section} — Could not load
          </p>
          <Button size="sm" variant="outline" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
