import { render, screen } from '@testing-library/react';

import phonemesJson from '@/data/content/phonemes.json';

import { ArticulationDiagram } from './ArticulationDiagram';

describe('ArticulationDiagram', () => {
  it('draws every one of the 44 sounds with a text description', () => {
    expect(phonemesJson).toHaveLength(44);
    for (const { id } of phonemesJson) {
      const { unmount } = render(<ArticulationDiagram soundId={id} />);
      expect(screen.getAllByRole('img'), id).toHaveLength(2);
      expect(document.querySelector('figcaption')?.textContent, id).not.toBe('');
      unmount();
    }
  });

  it('describes place, airflow and voicing for consonants and tongue and lips for vowels', () => {
    const { unmount } = render(<ArticulationDiagram soundId="c09" />);
    expect(
      screen.getByText(/Đầu lưỡi đặt giữa hai hàm răng, hơi xì qua khe hẹp, không rung/),
    ).toBeInTheDocument();
    unmount();
    const nasal = render(<ArticulationDiagram soundId="c18" />);
    expect(screen.getByText(/hơi đi qua mũi, có rung dây thanh/)).toBeInTheDocument();
    nasal.unmount();
    render(<ArticulationDiagram soundId="d02" />);
    expect(screen.getByText(/Lưỡi hạ thấp.*trượt từ vị trí đầu/)).toBeInTheDocument();
    expect(document.querySelectorAll('.articulation-diagram__frame')).toHaveLength(2);
  });

  it('draws nothing for an unknown sound', () => {
    expect(render(<ArticulationDiagram soundId="zz" />).container).toBeEmptyDOMElement();
  });
});
