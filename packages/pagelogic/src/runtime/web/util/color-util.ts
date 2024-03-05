
export interface Rgba {
	r: number,
	g: number,
	b: number,
	a?: number
}

export function mixColors(col1:string, col2:string, ratio:number): string {
  const rgba1 = color2Components(col1);
  const rgba2 = color2Components(col2);
  ratio = Math.max(Math.min(ratio, 1), 0);
  const r1 = rgba1 ? rgba1.r / 255.0 : 0;
  const r2 = rgba2 ? rgba2.r / 255.0 : 0;
  const g1 = rgba1 ? rgba1.g / 255.0 : 0;
  const g2 = rgba2 ? rgba2.g / 255.0 : 0;
  const b1 = rgba1 ? rgba1.b / 255.0 : 0;
  const b2 = rgba2 ? rgba2.b / 255.0 : 0;
  const a1 = rgba1 && rgba1.a != null ? rgba1.a : 1;
  const a2 = rgba2 && rgba2.a != null ? rgba2.a : 1;
  const ret = components2Color({
    r: Math.round((r2 * ratio + r1 * (1.0 - ratio)) * 255),
    g: Math.round((g2 * ratio + g1 * (1.0 - ratio)) * 255),
    b: Math.round((b2 * ratio + b1 * (1.0 - ratio)) * 255),
    a: (rgba1 && rgba1.a != null || rgba2 && rgba2.a != null)
      ? a2 * ratio + a1 * (1.0 - ratio)
      : undefined
  });
  return ret;
}

export function components2Color(rgba:Rgba): string {
  function hexByte(n:number): string {
    const ret = n.toString(16);
    return (ret.length > 1 ? ret : '0' + ret);
  }
  let ret = '#000';
  if (rgba != null) {
    if (rgba.a != null) {
      ret = `rgba(${rgba.r},${rgba.g},${rgba.b},${rgba.a})`;
    } else {
      ret = `#${hexByte(rgba.r)}${hexByte(rgba.g)}${hexByte(rgba.b)}`;
    }
  }
  return ret;
}

export function color2Components(s:string): Rgba|null {
  let ret:Rgba|null = null;
  const re1 = /#([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})/;
  const re2 = /rgb\s*[(]\s*([0-9]+)\s*,\s*([0-9]+)\s*,\s*([0-9]+)\s*[)]/;
  const re3 = /rgb\s*[(]\s*([0-9]+)[%]\s*,\s*([0-9]+)[%]\s*,\s*([0-9]+)[%]\s*[)]/;
  const re4 = /rgba\s*[(]\s*([0-9]+)\s*,\s*([0-9]+)\s*,\s*([0-9]+)\s*,\s*([.0-9]+)\s*[)]/;
  const re5 = /rgba\s*[(]\s*([0-9]+)[%]\s*,\s*([0-9]+)[%]\s*,\s*([0-9]+)[%]\s*,\s*([.0-9]+)\s*[)]/;
  let res;
  s = fullRgb(s);
  if ((res = re1.exec(s))) {
    ret = {
      r: parseInt('0x' + res[1]),
      g: parseInt('0x' + res[2]),
      b: parseInt('0x' + res[3]),
    };
  } else if ((res = re2.exec(s))) {
    ret = {
      r: parseInt(res[1]),
      g: parseInt(res[2]),
      b: parseInt(res[3]),
    };
  } else if ((res = re3.exec(s))) {
    ret = {
      r: Math.floor(parseInt(res[1]) * 255 / 100),
      g: Math.floor(parseInt(res[2]) * 255 / 100),
      b: Math.floor(parseInt(res[3]) * 255 / 100),
    };
  } else if ((res = re4.exec(s))) {
    ret = {
      r: parseInt(res[1]),
      g: parseInt(res[2]),
      b: parseInt(res[3]),
      a: parseFloat(res[4])
    };
  } else if ((res = re5.exec(s))) {
    ret = {
      r: Math.floor(parseInt(res[1]) * 255 / 100),
      g: Math.floor(parseInt(res[2]) * 255 / 100),
      b: Math.floor(parseInt(res[3]) * 255 / 100),
      a: parseFloat(res[4])
    };
  }
  return ret;
}

export function fullRgb(s:string): string {
  let ret = s;
  const re = /^#([0-9a-fA-F])([0-9a-fA-F])([0-9a-fA-F])$/;
  const res = re.exec(s);
  if (res) {
    const r = res[1];
    const g = res[2];
    const b = res[3];
    ret = `#${r}${r}${g}${g}${b}${b}`;
  }
  return ret;
}

export function opacity(s: string, a: number): string {
  const rgba = color2Components(s) as Rgba;
  rgba.a = a;
  return components2Color(rgba);
}
