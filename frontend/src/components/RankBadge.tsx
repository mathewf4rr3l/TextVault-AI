import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { RankInfo } from '../../utils/api';
import { COLORS, RADIUS } from '../../constants/theme';

interface Props {
  rank: RankInfo;
  size?: 'sm' | 'md' | 'lg';
  showTitle?: boolean;
}

export default function RankBadge({ rank, size = 'md', showTitle }: Props) {
  const dim = size === 'lg' ? 76 : size === 'sm' ? 34 : 52;
  const fontSize = size === 'lg' ? 40 : size === 'sm' ? 18 : 28;
  return (
    <View style={{ alignItems: 'center' }}>
      <View
        style={[
          styles.medal,
          {
            width: dim,
            height: dim,
            borderRadius: dim / 2,
            borderColor: rank.color,
            backgroundColor: `${rank.color}22`,
          },
        ]}
      >
        <Text style={{ fontSize }}>{rank.medal}</Text>
      </View>
      {showTitle && (
        <>
          <Text style={[styles.name, { color: rank.color }]}>{rank.name}</Text>
          {rank.title ? <Text style={styles.title}>{rank.title}</Text> : null}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  medal: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  name: { fontWeight: '800', fontSize: 16, marginTop: 8 },
  title: { color: COLORS.textSecondary, fontSize: 12, marginTop: 2 },
});
